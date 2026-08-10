const DB_NAME = 'lpz-offline';
const DB_VERSION = 2;
const STORE_NAME = 'pending-sales';
const CACHE_STORE = 'cached-products';

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface PendingSale {
  id?: number;
  body: Record<string, unknown>;
  createdAt: number;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
}

export async function queueSale(body: Record<string, unknown>): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).add({ body, createdAt: Date.now(), status: 'pending' } satisfies PendingSale);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingSales(): Promise<PendingSale[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const index = store.index('status');
  const range = IDBKeyRange.only('pending');
  return new Promise((resolve, reject) => {
    const result: PendingSale[] = [];
    const cursor = index.openCursor(range);
    cursor.onsuccess = () => {
      if (cursor.result) {
        result.push(cursor.result.value);
        cursor.result.continue();
      } else {
        resolve(result);
      }
    };
    cursor.onerror = () => reject(cursor.error);
  });
}

export async function markSyncing(id: number): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const data = await new Promise<PendingSale>((resolve, reject) => {
    const getReq = store.get(id);
    getReq.onsuccess = () => resolve(getReq.result);
    getReq.onerror = () => reject(getReq.error);
  });
  data.status = 'syncing';
  store.put(data);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function removeSale(id: number): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function markFailed(id: number, error: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const data = await new Promise<PendingSale>((resolve, reject) => {
    const getReq = store.get(id);
    getReq.onsuccess = () => resolve(getReq.result);
    getReq.onerror = () => reject(getReq.error);
  });
  data.status = 'failed';
  data.error = error;
  store.put(data);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueueCount(): Promise<number> {
  const pending = await getPendingSales();
  return pending.length;
}
