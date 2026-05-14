import type {
  BarcodeProfile,
  ExpiryStatus,
  FilterLocation,
  InventoryItem,
  ItemHistory,
  NewInventoryItem,
  SortDirection,
  SortField,
  StorageLocation
} from './models';
import {
  clearAllInventoryItems,
  getBarcodeProfile,
  getItemHistory,
  listBarcodeProfiles,
  listInventoryItems,
  listItemHistory,
  removeInventoryItem,
  upsertBarcodeProfile,
  upsertInventoryItem,
  upsertItemHistory
} from './storage';

export async function getInventory(): Promise<InventoryItem[]> {
  const items = await listInventoryItems();
  return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getFilteredInventory(options: {
  search?: string;
  location?: FilterLocation;
  sortField?: SortField;
  sortDirection?: SortDirection;
}): Promise<InventoryItem[]> {
  const { search = '', location = 'all', sortField = 'expiresAt', sortDirection = 'asc' } = options;
  let items = await listInventoryItems();

  if (location !== 'all') {
    items = items.filter((item) => item.location === location);
  }

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    items = items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.barcode?.toLowerCase().includes(q) ?? false) ||
        (item.category?.toLowerCase().includes(q) ?? false)
    );
  }

  items.sort((a, b) => {
    let cmp = 0;
    if (sortField === 'name') {
      cmp = a.name.localeCompare(b.name);
    } else if (sortField === 'createdAt') {
      cmp = a.createdAt.localeCompare(b.createdAt);
    } else {
      cmp = a.expiresAt.localeCompare(b.expiresAt);
    }
    return sortDirection === 'asc' ? cmp : -cmp;
  });

  return items;
}

export async function createInventoryItem(
  item: NewInventoryItem
): Promise<InventoryItem> {
  const timestamp = new Date().toISOString();
  const nextItem: InventoryItem = {
    id: crypto.randomUUID(),
    name: item.name,
    quantity: item.quantity,
    location: item.location,
    barcode: item.barcode ?? null,
    expiresAt: item.expiresAt,
    createdAt: timestamp,
    updatedAt: timestamp,
    category: item.category ?? null,
    depletionThreshold: item.depletionThreshold ?? null
  };

  await upsertInventoryItem(nextItem);
  await recordItemHistory(nextItem);
  return nextItem;
}

export async function updateInventoryItem(
  id: string,
  patch: Partial<
    Pick<InventoryItem, 'name' | 'quantity' | 'location' | 'barcode' | 'expiresAt' | 'category' | 'depletionThreshold'>
  >
): Promise<InventoryItem | null> {
  const items = await listInventoryItems();
  const existing = items.find((item) => item.id === id);

  if (!existing) {
    return null;
  }

  const nextItem: InventoryItem = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString()
  };

  await upsertInventoryItem(nextItem);
  return nextItem;
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await removeInventoryItem(id);
}

export async function clearInventory(): Promise<void> {
  await clearAllInventoryItems();
}

export async function decrementItemQuantity(
  id: string
): Promise<{ item: InventoryItem | null; depleted: boolean }> {
  const items = await listInventoryItems();
  const existing = items.find((item) => item.id === id);

  if (!existing) {
    return { item: null, depleted: false };
  }

  const nextQty = Math.max(0, existing.quantity - 1);
  const nextItem: InventoryItem = {
    ...existing,
    quantity: nextQty,
    updatedAt: new Date().toISOString()
  };

  await upsertInventoryItem(nextItem);

  const threshold = existing.depletionThreshold ?? 1;
  const depleted = nextQty <= threshold && existing.quantity > threshold;

  return { item: nextItem, depleted };
}

export function calculateExpiryStatus(
  expiresAt: string,
  warningWindowDays = 2,
  now = new Date()
): ExpiryStatus {
  const expiryTime = new Date(expiresAt).getTime();
  if (Number.isNaN(expiryTime)) {
    return 'fresh';
  }

  const msRemaining = expiryTime - now.getTime();
  if (msRemaining < 0) {
    return 'expired';
  }

  const dayMs = 24 * 60 * 60 * 1000;
  if (msRemaining <= warningWindowDays * dayMs) {
    return 'expiring-soon';
  }

  return 'fresh';
}

export function calculateExpiryDateISO(
  shelfLifeDays: number,
  fromDate = new Date()
): string {
  const safeDays = Math.max(1, Math.floor(shelfLifeDays));
  const next = new Date(fromDate);
  next.setDate(next.getDate() + safeDays);
  return next.toISOString();
}

export async function saveBarcodeProfile(input: {
  barcode: string;
  productName: string;
  defaultShelfLifeDays: number;
  preferredLocation: StorageLocation;
}): Promise<BarcodeProfile> {
  const profile: BarcodeProfile = {
    barcode: input.barcode,
    productName: input.productName,
    defaultShelfLifeDays: Math.max(1, Math.floor(input.defaultShelfLifeDays)),
    preferredLocation: input.preferredLocation,
    updatedAt: new Date().toISOString()
  };

  await upsertBarcodeProfile(profile);
  return profile;
}

export async function findBarcodeProfile(
  barcode: string
): Promise<BarcodeProfile | null> {
  return getBarcodeProfile(barcode);
}

export async function getBarcodeProfiles(): Promise<BarcodeProfile[]> {
  const profiles = await listBarcodeProfiles();
  return profiles.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function recordItemHistory(item: InventoryItem): Promise<void> {
  const historyId = item.name.trim().toLowerCase();
  const existing = await getItemHistory(historyId);

  const shelfLifeDays = Math.round(
    (new Date(item.expiresAt).getTime() - new Date(item.createdAt).getTime()) /
      (24 * 60 * 60 * 1000)
  );

  const entry: ItemHistory = {
    id: historyId,
    name: item.name,
    barcode: item.barcode,
    location: item.location,
    shelfLifeDays: Math.max(1, shelfLifeDays),
    category: item.category,
    lastUsedAt: new Date().toISOString(),
    useCount: (existing?.useCount ?? 0) + 1
  };

  await upsertItemHistory(entry);
}

export async function getFrequentItems(limit = 5): Promise<ItemHistory[]> {
  const history = await listItemHistory();
  return history
    .sort((a, b) => b.useCount - a.useCount || b.lastUsedAt.localeCompare(a.lastUsedAt))
    .slice(0, limit);
}

export function exportInventoryAsJSON(items: InventoryItem[]): string {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), items }, null, 2);
}

export function exportInventoryAsCSV(items: InventoryItem[]): string {
  const header = 'name,quantity,location,barcode,expiresAt,category,createdAt';
  const rows = items.map((item) =>
    [
      `"${item.name.replace(/"/g, '""')}"`,
      item.quantity,
      item.location,
      item.barcode ?? '',
      item.expiresAt,
      item.category ?? '',
      item.createdAt
    ].join(',')
  );
  return [header, ...rows].join('\n');
}

export function parseInventoryJSON(json: string): InventoryItem[] {
  const parsed = JSON.parse(json) as { version?: number; items?: unknown };
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid export file');
  }
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  return items.filter(
    (item): item is InventoryItem =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as Record<string, unknown>).id === 'string' &&
      typeof (item as Record<string, unknown>).name === 'string'
  );
}

export async function importInventoryItems(items: InventoryItem[]): Promise<number> {
  let count = 0;
  for (const item of items) {
    const sanitized: InventoryItem = {
      ...item,
      category: item.category ?? null,
      depletionThreshold: item.depletionThreshold ?? null
    };
    await upsertInventoryItem(sanitized);
    count++;
  }
  return count;
}
