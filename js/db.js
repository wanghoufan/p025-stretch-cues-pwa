const DB_NAME = 'stretch-voice-pwa';
const DB_VERSION = 1;
const STORES = ['routines', 'history', 'settings', 'meta'];

let dbPromise = null;

export function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      STORES.forEach((name) => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: name === 'settings' || name === 'meta' ? 'key' : 'id' });
        }
      });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function run(store, mode, action) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const objectStore = tx.objectStore(store);
    let value;
    try {
      value = action(objectStore);
    } catch (error) {
      reject(error);
      return;
    }
    tx.oncomplete = () => resolve(value && value.__request ? value.__request.result : value);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

export function getAll(store) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const request = tx.objectStore(store).getAll();
    let rows = [];
    request.onsuccess = () => { rows = request.result || []; };
    tx.oncomplete = () => resolve(rows);
    tx.onerror = () => reject(tx.error);
  }));
}

export function get(store, key) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const request = tx.objectStore(store).get(key);
    let row = null;
    request.onsuccess = () => { row = request.result || null; };
    tx.oncomplete = () => resolve(row);
    tx.onerror = () => reject(tx.error);
  }));
}

export function put(store, value) {
  return run(store, 'readwrite', (objectStore) => {
    objectStore.put(value);
    return value;
  });
}

export function bulkPut(store, values) {
  return run(store, 'readwrite', (objectStore) => {
    values.forEach((value) => objectStore.put(value));
    return values.length;
  });
}

export function remove(store, key) {
  return run(store, 'readwrite', (objectStore) => {
    objectStore.delete(key);
    return true;
  });
}

export function clear(store) {
  return run(store, 'readwrite', (objectStore) => {
    objectStore.clear();
    return true;
  });
}
