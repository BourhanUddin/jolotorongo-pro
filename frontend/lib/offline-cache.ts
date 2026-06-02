type CacheRecord = {
  key: string;
  payload: unknown;
  savedAt: number;
};

const DB_NAME = 'jolotorongo-offline';
const STORE_NAME = 'api-cache';
const DB_VERSION = 1;

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const withStore = async <T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) => {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const request = run(tx.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
};

export const offlineCache = {
  async set(key: string, payload: unknown) {
    try {
      await withStore('readwrite', (store) => store.put({ key, payload, savedAt: Date.now() }));
    } catch {
      // Offline cache is best-effort. Network result must not fail because storage did.
    }
  },
  async get<T>(key: string) {
    try {
      const record = await withStore<CacheRecord | undefined>('readonly', (store) => store.get(key));
      return record?.payload as T | undefined;
    } catch {
      return undefined;
    }
  },
};
