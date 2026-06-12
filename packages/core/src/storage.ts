import { openDB } from 'idb';
import type { DBSchema } from 'idb';
import type { BarcodeProfile, InventoryItem, ItemHistory, WasteLogEntry } from './models';

interface BeforeItsGoneDB extends DBSchema {
  inventory: {
    key: string;
    value: InventoryItem;
  };
  barcodeProfiles: {
    key: string;
    value: BarcodeProfile;
  };
  itemHistory: {
    key: string;
    value: ItemHistory;
  };
  wasteLog: {
    key: string;
    value: WasteLogEntry;
  };
}

const dbPromise = openDB<BeforeItsGoneDB>('before-its-gone', 4, {
  upgrade(database, oldVersion) {
    if (oldVersion < 2) {
      if (!database.objectStoreNames.contains('inventory')) {
        database.createObjectStore('inventory', { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains('barcodeProfiles')) {
        database.createObjectStore('barcodeProfiles', { keyPath: 'barcode' });
      }
    }
    if (oldVersion < 3) {
      if (!database.objectStoreNames.contains('itemHistory')) {
        database.createObjectStore('itemHistory', { keyPath: 'id' });
      }
    }
    if (oldVersion < 4) {
      if (!database.objectStoreNames.contains('wasteLog')) {
        database.createObjectStore('wasteLog', { keyPath: 'id' });
      }
    }
  }
});

export async function listInventoryItems(): Promise<InventoryItem[]> {
  const database = await dbPromise;
  return database.getAll('inventory');
}

export async function upsertInventoryItem(item: InventoryItem): Promise<void> {
  const database = await dbPromise;
  await database.put('inventory', item);
}

export async function removeInventoryItem(id: string): Promise<void> {
  const database = await dbPromise;
  await database.delete('inventory', id);
}

export async function clearAllInventoryItems(): Promise<void> {
  const database = await dbPromise;
  await database.clear('inventory');
}

export async function getBarcodeProfile(
  barcode: string
): Promise<BarcodeProfile | null> {
  const database = await dbPromise;
  return (await database.get('barcodeProfiles', barcode)) ?? null;
}

export async function listBarcodeProfiles(): Promise<BarcodeProfile[]> {
  const database = await dbPromise;
  return database.getAll('barcodeProfiles');
}

export async function upsertBarcodeProfile(
  profile: BarcodeProfile
): Promise<void> {
  const database = await dbPromise;
  await database.put('barcodeProfiles', profile);
}

export async function getItemHistory(id: string): Promise<ItemHistory | null> {
  const database = await dbPromise;
  return (await database.get('itemHistory', id)) ?? null;
}

export async function listItemHistory(): Promise<ItemHistory[]> {
  const database = await dbPromise;
  return database.getAll('itemHistory');
}

export async function upsertItemHistory(entry: ItemHistory): Promise<void> {
  const database = await dbPromise;
  await database.put('itemHistory', entry);
}

export async function addWasteLogEntry(entry: WasteLogEntry): Promise<void> {
  const database = await dbPromise;
  await database.put('wasteLog', entry);
}

export async function listWasteLogEntries(): Promise<WasteLogEntry[]> {
  const database = await dbPromise;
  return database.getAll('wasteLog');
}

export async function clearWasteLogEntries(): Promise<void> {
  const database = await dbPromise;
  await database.clear('wasteLog');
}

export interface KeyValueStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

class BrowserLocalStorageAdapter implements KeyValueStorage {
  async get<T>(key: string): Promise<T | null> {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const value = localStorage.getItem(key);
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // QuotaExceededError; notification state is best-effort
    }
  }

  async remove(key: string): Promise<void> {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.removeItem(key);
  }
}

export function createLocalStorageAdapter(): KeyValueStorage {
  return new BrowserLocalStorageAdapter();
}
