#!/usr/bin/env python3
"""Bounded Chaos Engineering runner for Souq staging.

The script is intentionally conservative:
- dry-run is the default;
- production-like DATABASE_URLs are rejected;
- only allow-listed scenarios can run;
- every scenario has a timeout and cleanup path;
- no DROP, TRUNCATE, DELETE, db:push, or production mutation is performed.

Requirements for database scenarios: mysql CLI on PATH and STAGING_DATABASE_URL.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import signal
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

MAX_DURATION_SECONDS = 600
MAX_CONNECTIONS = 40
MAX_FILL_MB = 512
SCENARIOS = {
    "health-check",
    "synthetic-alert",
    "disk-fill",
    "connection-pressure",
    "lock-wait",
}


class ChaosAbort(Exception):
    pass


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def log(event: str, **fields: object) -> None:
    print(json.dumps({"timestamp": utc_now(), "event": event, **fields}, ensure_ascii=False), flush=True)


def reject_unsafe_environment() -> None:
    env = os.getenv("ENVIRONMENT", "").lower()
    if env != "staging":
        raise ChaosAbort("ENVIRONMENT must be exactly 'staging'")
    if os.getenv("CHAOS_ENABLED", "").lower() != "true":
        raise ChaosAbort("CHAOS_ENABLED=true is required")
    if os.getenv("NODE_ENV", "").lower() == "production":
        raise ChaosAbort("NODE_ENV=production is never allowed")

    url = os.getenv("STAGING_DATABASE_URL", "")
    if url:
        lowered = url.lower()
        forbidden = ("production", "prod-db", "prod.", "localhost", "127.0.0.1")
        if any(marker in lowered for marker in forbidden):
            raise ChaosAbort("STAGING_DATABASE_URL looks like a production or local database")
        if not lowered.startswith(("mysql://", "mysql2://")):
            raise ChaosAbort("STAGING_DATABASE_URL must use mysql:// or mysql2://")


def run_command(args: list[str], timeout: int, *, input_text: str | None = None) -> subprocess.CompletedProcess[str]:
    log("command_start", command=" ".join(shlex.quote(a) for a in args), timeout=timeout)
    result = subprocess.run(
        args,
        input=input_text,
        text=True,
        capture_output=True,
        timeout=timeout,
        check=False,
        env={k: v for k, v in os.environ.items() if k not in {"DATABASE_URL", "STAGING_DATABASE_URL"}},
    )
    log("command_finish", returncode=result.returncode, stdout=result.stdout[-1000:], stderr=result.stderr[-1000:])
    return result


def mysql_query(sql: str, timeout: int = 15) -> str:
    url = os.environ.get("STAGING_DATABASE_URL")
    if not url:
        raise ChaosAbort("STAGING_DATABASE_URL is required for this scenario")
    if not shutil_which("mysql"):
        raise ChaosAbort("mysql CLI is required for database scenarios")
    result = subprocess.run(
        ["mysql", url, "--connect-timeout=5", "--batch", "--skip-column-names", "-e", sql],
        text=True,
        capture_output=True,
        timeout=timeout,
        check=False,
    )
    if result.returncode != 0:
        raise ChaosAbort(f"mysql query failed: {result.stderr[-500:]}")
    return result.stdout.strip()


def shutil_which(command: str) -> str | None:
    # Avoid importing shutil in every call and keep this script easy to audit.
    for directory in os.environ.get("PATH", "").split(os.pathsep):
        candidate = Path(directory) / command
        if candidate.is_file() and os.access(candidate, os.X_OK):
            return str(candidate)
    return None


def scenario_health_check(args: argparse.Namespace) -> None:
    url = args.base_url.rstrip("/") + "/api/health"
    log("health_check_start", url=url)
    try:
        with urllib.request.urlopen(url, timeout=5) as response:
            body = response.read(500).decode("utf-8", "replace")
            if response.status >= 500:
                raise ChaosAbort(f"health endpoint returned {response.status}")
            log("health_check_pass", status=response.status, body=body)
    except urllib.error.URLError as exc:
        raise ChaosAbort(f"health endpoint unavailable: {exc}") from exc


def scenario_synthetic_alert(args: argparse.Namespace) -> None:
    if not args.webhook_url:
        raise ChaosAbort("--webhook-url is required for synthetic-alert")
    payload = json.dumps({
        "status": "firing",
        "alerts": [{
            "status": "firing",
            "labels": {"alertname": "SouqChaosSynthetic", "severity": "critical", "action": "verify-and-escalate", "environment": "staging"},
            "annotations": {"summary": "Synthetic staging alert"},
            "fingerprint": f"chaos-{int(time.time())}",
        }],
    }).encode()
    request = urllib.request.Request(args.webhook_url, data=payload, headers={"Content-Type": "application/json", "X-Chaos-Staging": "true"}, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            log("synthetic_alert_result", status=response.status, body=response.read(500).decode("utf-8", "replace"))
    except urllib.error.HTTPError as exc:
        raise ChaosAbort(f"webhook returned HTTP {exc.code}") from exc
    except urllib.error.URLError as exc:
        raise ChaosAbort(f"webhook unavailable: {exc}") from exc


def scenario_disk_fill(args: argparse.Namespace) -> None:
    if args.fill_mb > MAX_FILL_MB:
        raise ChaosAbort(f"--fill-mb cannot exceed {MAX_FILL_MB}")
    path = Path(args.temp_dir) / f"souq-chaos-{os.getpid()}.tmp"
    size = args.fill_mb * 1024 * 1024
    log("disk_fill_start", path=str(path), bytes=size)
    try:
        with path.open("wb") as handle:
            handle.truncate(size)
        log("disk_fill_active", path=str(path))
        time.sleep(args.hold_seconds)
    finally:
        try:
            path.unlink(missing_ok=True)
            log("disk_fill_cleanup", path=str(path))
        except OSError as exc:
            log("disk_fill_cleanup_failed", path=str(path), error=str(exc))
            raise


def scenario_connection_pressure(args: argparse.Namespace) -> None:
    if args.connections > MAX_CONNECTIONS:
        raise ChaosAbort(f"--connections cannot exceed {MAX_CONNECTIONS}")
    if not os.getenv("STAGING_DATABASE_URL"):
        raise ChaosAbort("STAGING_DATABASE_URL is required")
    if not shutil_which("mysql"):
        raise ChaosAbort("mysql CLI is required")
    processes: list[subprocess.Popen[str]] = []
    try:
        for _ in range(args.connections):
            # Sleep inside a transaction is intentionally avoided: no locks or writes are created.
            process = subprocess.Popen(
                ["mysql", os.environ["STAGING_DATABASE_URL"], "--connect-timeout=5", "-e", "SELECT SLEEP(%d);" % args.hold_seconds],
                stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True,
            )
            processes.append(process)
        log("connection_pressure_active", connections=len(processes), hold_seconds=args.hold_seconds)
        deadline = time.monotonic() + args.hold_seconds + 10
        while time.monotonic() < deadline and any(p.poll() is None for p in processes):
            time.sleep(1)
    finally:
        for process in processes:
            if process.poll() is None:
                process.terminate()
        for process in processes:
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
        log("connection_pressure_cleanup", processes=len(processes))


def scenario_lock_wait(args: argparse.Namespace) -> None:
    if args.dry_run:
        log("dry_run", scenario="lock-wait", note="would use two staging mysql sessions and always ROLLBACK")
        return
    raise ChaosAbort("lock-wait requires a reviewed staging-specific implementation; dry-run is the safe default")


SCENARIO_HANDLERS: dict[str, Callable[[argparse.Namespace], None]] = {
    "health-check": scenario_health_check,
    "synthetic-alert": scenario_synthetic_alert,
    "disk-fill": scenario_disk_fill,
    "connection-pressure": scenario_connection_pressure,
    "lock-wait": scenario_lock_wait,
}


def main() -> int:
    parser = argparse.ArgumentParser(description="Bounded Chaos Engineering runner for Souq staging")
    parser.add_argument("scenario", choices=sorted(SCENARIOS))
    parser.add_argument("--base-url", help="Staging application URL for health-check")
    parser.add_argument("--webhook-url", help="Staging alert webhook URL for synthetic-alert")
    parser.add_argument("--connections", type=int, default=10)
    parser.add_argument("--fill-mb", type=int, default=64)
    parser.add_argument("--hold-seconds", type=int, default=30)
    parser.add_argument("--temp-dir", default="/tmp")
    parser.add_argument("--max-duration", type=int, default=120)
    parser.add_argument("--dry-run", action="store_true", default=True, help="Default safety mode; pass --execute to run")
    parser.add_argument("--execute", action="store_true", help="Actually run the selected bounded scenario")
    args = parser.parse_args()

    if args.max_duration < 1 or args.max_duration > MAX_DURATION_SECONDS:
        parser.error(f"--max-duration must be between 1 and {MAX_DURATION_SECONDS}")
    if args.hold_seconds < 1 or args.hold_seconds > args.max_duration:
        parser.error("--hold-seconds must be positive and no greater than --max-duration")
    if args.connections < 1 or args.fill_mb < 1:
        parser.error("connection and disk limits must be positive")

    try:
        reject_unsafe_environment()
        log("chaos_run_start", scenario=args.scenario, dry_run=not args.execute, environment=os.environ.get("ENVIRONMENT"))
        if not args.execute:
            log("dry_run", scenario=args.scenario, note="pass --execute only after confirming staging scope and rollback readiness")
            return 0
        handler = SCENARIO_HANDLERS[args.scenario]
        handler(args)
        log("chaos_run_pass", scenario=args.scenario)
        return 0
    except (ChaosAbort, subprocess.TimeoutExpired, KeyboardInterrupt) as exc:
        log("chaos_run_failed", scenario=args.scenario, error=str(exc))
        return 2


if __name__ == "__main__":
    sys.exit(main())
