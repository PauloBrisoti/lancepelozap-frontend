import type { Product } from '../types/api';
import { openDB } from './offlineSales';

const CACHE_NAME = 'cached-products';

interface CachedProduct {
  id: string;
  data: Product;
  cachedAt: number;
}

export async function cacheProducts(products: Product[]): Promise<void> {
  const db = await openDB();
  if (!db.objectStoreNames.contains(CACHE_NAME)) return;
  const tx = db.transaction(CACHE_NAME, 'readwrite');
  const store = tx.objectStore(CACHE_NAME);
  const now = Date.now();
  for (const p of products) {
    store.put({ id: p.id, data: p, cachedAt: now } satisfies CachedProduct);
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedProducts(): Promise<Product[]> {
  const db = await openDB();
  if (!db.objectStoreNames.contains(CACHE_NAME)) return [];
  const tx = db.transaction(CACHE_NAME, 'readonly');
  const store = tx.objectStore(CACHE_NAME);
  return new Promise((resolve, reject) => {
    const result: Product[] = [];
    const cursor = store.openCursor();
    cursor.onsuccess = () => {
      if (cursor.result) {
        result.push(cursor.result.value.data);
        cursor.result.continue();
      } else {
        resolve(result);
      }
    };
    cursor.onerror = () => reject(cursor.error);
  });
}
