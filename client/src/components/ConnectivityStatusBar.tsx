import { useCallback, useEffect, useState } from "react";
import { CloudOff, Cloudy, LoaderCircle, RefreshCw, ReceiptText, Wifi } from "lucide-react";
import {
  countPendingInvoices,
  subscribeToOfflineInvoiceChanges,
} from "@/lib/offlineInvoices";

type ConnectivityStatusBarProps = {
  className?: string;
  onPendingInvoicesClick?: () => void;
};

export function ConnectivityStatusBar({
  className = "",
  onPendingInvoicesClick,
}: ConnectivityStatusBarProps) {
  const [isOnline, setIsOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [pendingInvoices, setPendingInvoices] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refreshPendingInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      setPendingInvoices(await countPendingInvoices());
    } catch {
      // IndexedDB may be disabled in private browsing; the banner still reports connectivity.
      setPendingInvoices(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    void refreshPendingInvoices();
    const unsubscribe = subscribeToOfflineInvoiceChanges(() => void refreshPendingInvoices());

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      unsubscribe();
    };
  }, [refreshPendingInvoices]);

  const statusText = isOnline ? "متصل بالإنترنت" : "تعمل دون اتصال";
  const StatusIcon = isOnline ? Wifi : CloudOff;

  return (
    <div
      dir="rtl"
      role="status"
      aria-live="polite"
      data-online={isOnline}
      className={`flex w-full flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5 text-sm shadow-sm ${
        isOnline
          ? "border-emerald-200 bg-emerald-50 text-emerald-950"
          : "border-amber-200 bg-amber-50 text-amber-950"
      } ${className}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
            isOnline ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
          aria-hidden="true"
        >
          <StatusIcon className="h-4 w-4" />
        </span>
        <span className="font-bold">{statusText}</span>
        <span className="hidden text-xs opacity-70 sm:inline">
          {isOnline ? "يمكن مزامنة الفواتير الآن" : "ستتم المزامنة تلقائيًا عند عودة الاتصال"}
        </span>
      </div>

      <button
        type="button"
        onClick={onPendingInvoicesClick}
        disabled={!onPendingInvoicesClick}
        className="group flex items-center gap-2 rounded-full border border-current/15 bg-white/70 px-3 py-1.5 text-xs font-black transition hover:bg-white disabled:cursor-default disabled:opacity-100"
        aria-label={`${pendingInvoices} فواتير معلقة في الكاشير`}
      >
        <ReceiptText className="h-4 w-4" />
        <span>فواتير معلقة</span>
        <span className="grid min-w-6 place-items-center rounded-full bg-[#30205c] px-1.5 py-0.5 text-white">
          {isLoading ? <LoaderCircle className="h-3 w-3 animate-spin" /> : pendingInvoices}
        </span>
        {pendingInvoices > 0 && !isOnline && <Cloudy className="h-3.5 w-3.5 opacity-70" />}
      </button>

      {pendingInvoices > 0 && isOnline && (
        <span className="flex items-center gap-1 text-xs font-bold text-emerald-800">
          <RefreshCw className="h-3.5 w-3.5" /> جاهزة للمزامنة
        </span>
      )}
    </div>
  );
}
