import { openDB } from 'idb';

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private readonly prefix = '') {}

  private key(k: string): string {
    return this.prefix ? `${this.prefix}.${k}` : k;
  }

  async get<T>(key: string): Promise<T | null> {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(this.key(key));
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.key(key), JSON.stringify(value));
    } catch {
      // QuotaExceededError — best-effort
    }
  }

  async delete(key: string): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.key(key));
  }

  async clear(): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    for (const k of await this.keys()) {
      localStorage.removeItem(this.key(k));
    }
  }

  async keys(): Promise<string[]> {
    if (typeof localStorage === 'undefined') return [];
    const prefixDot = this.prefix ? `${this.prefix}.` : '';
    const result: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k !== null) {
        if (prefixDot) {
          if (k.startsWith(prefixDot)) result.push(k.slice(prefixDot.length));
        } else {
          result.push(k);
        }
      }
    }
    return result;
  }
}

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

export type { StorageAdapter as KeyValueStorage };

export function createLocalStorageAdapter(): LocalStorageAdapter {
  return new LocalStorageAdapter();
}
