#!/usr/bin/env node

/**
 * Smoke test for the local auth flow.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 JWT_SECRET=... node scripts/auth-flow-smoke.mjs
 *   pnpm test:auth:e2e
 *
 * The server must be running with DATABASE_URL configured.
 */

const baseUrl = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const user = {
  name: "Smoke Test User",
  email: `smoke-user-${runId}@example.com`,
  password: "SmokeUser123!",
  type: "user",
};
const seller = {
  name: "Smoke Test Seller",
  email: `smoke-seller-${runId}@example.com`,
  password: "SmokeSeller123!",
  type: "seller",
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function getCookie(response) {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) return "";
  return setCookie.split(",").map(value => value.split(";", 1)[0]).join("; ");
}

async function callTRPC(path, input, cookie = "") {
  const response = await fetch(`${baseUrl}/api/trpc/${path}?batch=1`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify({ 0: { json: input } }),
  });

  const raw = await response.text();
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error(`${path}: server returned non-JSON (${response.status}): ${raw.slice(0, 200)}`);
  }

  const item = Array.isArray(payload) ? payload[0] : payload;
  const error = item?.error;
  if (error) {
    const data = error.data ?? {};
    const message = error.json?.message ?? error.message ?? "Unknown tRPC error";
    return { response, cookie: "", error: { code: data.code ?? error.code, message }, data: null };
  }

  const data = item?.result?.data?.json ?? item?.result?.data;
  return { response, cookie: getCookie(response), error: null, data };
}

async function expectSuccess(label, path, input, cookie = "") {
  const result = await callTRPC(path, input, cookie);
  assert(!result.error, `${label} failed: ${result.error?.code ?? "UNKNOWN"} ${result.error?.message ?? ""}`);
  assert(result.response.ok, `${label} returned HTTP ${result.response.status}`);
  console.log(`PASS  ${label}`);
  return result;
}

async function expectError(label, path, input, expectedCode, cookie = "") {
  const result = await callTRPC(path, input, cookie);
  assert(result.error, `${label} unexpectedly succeeded`);
  assert(result.error.code === expectedCode, `${label} returned ${result.error.code}; expected ${expectedCode}`);
  console.log(`PASS  ${label} (${expectedCode})`);
  return result;
}

async function main() {
  console.log(`Testing auth flow at ${baseUrl}`);

  const userRegistration = await expectSuccess("register user", "auth.register", user);
  assert(["user", "admin"].includes(userRegistration.data?.user?.role), `unexpected user role: ${userRegistration.data?.user?.role}`);
  const userCookie = userRegistration.cookie;
  assert(userCookie, "register user did not return a session cookie");

  await expectSuccess("login user", "auth.login", { email: user.email, password: user.password });
  await expectError("reject wrong user password", "auth.login", { email: user.email, password: "WrongPassword123!" }, "UNAUTHORIZED");
  await expectError("reject duplicate user email", "auth.register", user, "CONFLICT");

  const sellerRegistration = await expectSuccess("register seller", "auth.register", seller);
  assert(sellerRegistration.data?.user?.role === "seller", `unexpected seller role: ${sellerRegistration.data?.user?.role}`);
  const sellerCookie = sellerRegistration.cookie;
  assert(sellerCookie, "register seller did not return a session cookie");

  await expectSuccess("login seller", "auth.login", { email: seller.email, password: seller.password });
  await expectError("reject wrong seller password", "auth.login", { email: seller.email, password: "WrongPassword123!" }, "UNAUTHORIZED");
  await expectError("reject duplicate seller email", "auth.register", seller, "CONFLICT");

  console.log("ALL AUTH FLOW CHECKS PASSED");
}

main().catch(error => {
  console.error(`FAIL  ${error.message}`);
  console.error(`Hint: start the app with DATABASE_URL configured, then rerun with BASE_URL if needed.`);
  process.exitCode = 1;
});
