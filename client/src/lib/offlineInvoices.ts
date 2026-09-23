const DB_NAME = "souq-offline";
const DB_VERSION = 1;
const STORE_NAME = "invoices";

export type OfflineInvoiceStatus = "pending" | "syncing" | "synced" | "failed";

export type OfflineInvoice = {
  id: string;
  status: OfflineInvoiceStatus;
  createdAt: number;
  payload?: unknown;
};

function openInvoiceDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not available"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open IndexedDB"));
  });
}

export async function countPendingInvoices(): Promise<number> {
  const db = await openInvoiceDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => {
      const pendingStatuses = new Set<OfflineInvoiceStatus>(["pending", "syncing", "failed"]);
      resolve((request.result as OfflineInvoice[]).filter(invoice => pendingStatuses.has(invoice.status)).length);
    };
    request.onerror = () => reject(request.error ?? new Error("Unable to count invoices"));
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => db.close();
  });
}

export async function saveOfflineInvoice(invoice: OfflineInvoice): Promise<void> {
  const db = await openInvoiceDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(invoice);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Unable to save invoice"));
  }).finally(() => db.close());
  notifyOfflineInvoiceChanges();
}

export function subscribeToOfflineInvoiceChanges(listener: () => void): () => void {
  const eventName = "souq:offline-invoices-changed";
  window.addEventListener(eventName, listener);
  const channel = typeof window.BroadcastChannel === "function" ? new BroadcastChannel(eventName) : null;
  channel?.addEventListener("message", listener);
  return () => {
    window.removeEventListener(eventName, listener);
    channel?.removeEventListener("message", listener);
    channel?.close();
  };
}

export function notifyOfflineInvoiceChanges(): void {
  window.dispatchEvent(new CustomEvent("souq:offline-invoices-changed"));
  if (typeof window.BroadcastChannel === "function") {
    const channel = new BroadcastChannel("souq:offline-invoices-changed");
    channel.postMessage({ changedAt: Date.now() });
    channel.close();
  }
}
