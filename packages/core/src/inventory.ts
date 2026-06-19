import type {
  BarcodeProfile,
  ExpiryStatus,
  FilterLocation,
  InventoryItem,
  ItemHistory,
  NewInventoryItem,
  SortDirection,
  SortField,
  StorageLocation,
  WasteLogEntry
} from './models';
import {
  addWasteLogEntry,
  clearAllInventoryItems,
  clearWasteLogEntries,
  getBarcodeProfile,
  getItemHistory,
  listBarcodeProfiles,
  listInventoryItems,
  listItemHistory,
  listWasteLogEntries,
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
  tags?: string[];
}): Promise<InventoryItem[]> {
  const { search = '', location = 'all', sortField = 'expiresAt', sortDirection = 'asc', tags = [] } = options;
  let items = await listInventoryItems();

  if (location !== 'all') {
    items = items.filter((item) => item.location === location);
  }

  if (tags.length > 0) {
    items = items.filter((item) => tags.every((t) => item.tags.includes(t)));
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
  const shelfLifeDays =
    item.shelfLifeDays ??
    Math.max(1, Math.round((new Date(item.expiresAt).getTime() - Date.now()) / 86_400_000));
  const nextItem: InventoryItem = {
    id: crypto.randomUUID(),
    name: item.name,
    quantity: item.quantity,
    location: item.location,
    barcode: item.barcode ?? null,
    expiresAt: item.expiresAt,
    shelfLifeDays,
    createdAt: timestamp,
    updatedAt: timestamp,
    category: item.category ?? null,
    depletionThreshold: item.depletionThreshold ?? null,
    tags: item.tags ?? [],
    recurring: item.recurring ?? false,
    restockQuantity: item.restockQuantity,
  };

  await upsertInventoryItem(nextItem);
  await recordItemHistory(nextItem);
  return nextItem;
}

export async function updateInventoryItem(
  id: string,
  patch: Partial<
    Pick<InventoryItem, 'name' | 'quantity' | 'location' | 'barcode' | 'expiresAt' | 'shelfLifeDays' | 'category' | 'depletionThreshold' | 'tags' | 'recurring' | 'restockQuantity' | 'photo'>
  >
): Promise<InventoryItem | null> {
  const items = await listInventoryItems();
  const existing = items.find((item) => item.id === id);

  if (!existing) {
    return null;
  }

  // Strip undefined values from patch so absent optional fields don't overwrite stored data
  const cleanPatch = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined)
  ) as typeof patch;

  const nextItem: InventoryItem = {
    ...existing,
    ...cleanPatch,
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

export async function incrementItemQuantity(
  id: string,
  by = 1
): Promise<InventoryItem | null> {
  const items = await listInventoryItems();
  const existing = items.find((item) => item.id === id);
  if (!existing) return null;

  const nextItem: InventoryItem = {
    ...existing,
    quantity: existing.quantity + Math.max(1, Math.floor(by)),
    updatedAt: new Date().toISOString()
  };

  await upsertInventoryItem(nextItem);
  return nextItem;
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
  caloriesPer100g?: number | null;
  allergens?: string[];
}): Promise<BarcodeProfile> {
  const profile: BarcodeProfile = {
    barcode: input.barcode,
    productName: input.productName,
    defaultShelfLifeDays: Math.max(1, Math.floor(input.defaultShelfLifeDays)),
    preferredLocation: input.preferredLocation,
    updatedAt: new Date().toISOString(),
    caloriesPer100g: input.caloriesPer100g ?? null,
    allergens: input.allergens ?? [],
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

export function getShoppingList(items: InventoryItem[]): InventoryItem[] {
  return items
    .filter((item) => item.depletionThreshold !== null && item.quantity <= item.depletionThreshold)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function logWastedItem(item: InventoryItem): Promise<WasteLogEntry> {
  const entry: WasteLogEntry = {
    id: crypto.randomUUID(),
    itemName: item.name,
    quantity: item.quantity,
    location: item.location,
    category: item.category,
    expiresAt: item.expiresAt,
    wastedAt: new Date().toISOString(),
  };
  await addWasteLogEntry(entry);
  return entry;
}

export async function getWasteLog(): Promise<WasteLogEntry[]> {
  const entries = await listWasteLogEntries();
  return entries.sort((a, b) => b.wastedAt.localeCompare(a.wastedAt));
}

export async function clearWasteLog(): Promise<void> {
  await clearWasteLogEntries();
}

export function exportInventoryAsJSON(items: InventoryItem[]): string {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), items }, null, 2);
}

export function exportInventoryAsCSV(items: InventoryItem[]): string {
  const header = 'name,quantity,location,barcode,expiresAt,category,tags,shelf_life_days,depletion_threshold,createdAt';
  const rows = items.map((item) =>
    [
      `"${item.name.replace(/"/g, '""')}"`,
      item.quantity,
      item.location,
      item.barcode ?? '',
      item.expiresAt.slice(0, 10),
      item.category ?? '',
      (item.tags ?? []).join(';'),
      item.shelfLifeDays ?? '',
      item.depletionThreshold ?? '',
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

const MONTH_MAP: Record<string, string> = {
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', sept: '09', september: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12',
};

function toExpiryISO(yyyy: string, mm: string, dd: string): string | null {
  const y = Number(yyyy);
  const m = Number(mm);
  const d = Number(dd);
  const iso = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T23:59:59.000Z`;
  const date = new Date(iso);
  // JS silently overflows invalid dates (e.g. Feb 30 → Mar 2); round-trip to catch them
  if (
    isNaN(date.getTime()) ||
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() + 1 !== m ||
    date.getUTCDate() !== d
  ) return null;
  return iso;
}

/**
 * Accepts a date string in any common human-written format and returns a
 * canonical `YYYY-MM-DDT23:59:59.000Z` string, or null if unrecognised.
 * Called automatically during CSV import so users don't need to know ISO format.
 *
 * Supported formats:
 *   YYYY-MM-DD · YYYY/MM/DD · YYYY.MM.DD
 *   MM/DD/YYYY · M/D/YYYY (American slash)
 *   MM-DD-YYYY · M-D-YYYY (American dash, 4-digit year at end)
 *   Full ISO timestamp (time portion is discarded)
 *   "June 1, 2026" · "Jun 1 2026" · "1 June 2026" · "1 Jun 2026"
 *
 * Ambiguous formats like DD/MM/YYYY are interpreted as MM/DD/YYYY (American).
 * Use YYYY-MM-DD to avoid ambiguity.
 */
export function normalizeDate(input: string): string | null {
  const s = input.trim();
  if (!s) return null;

  // Full ISO timestamp — discard time portion, re-canonicalize
  const isoFull = s.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (isoFull) return toExpiryISO(isoFull[1], isoFull[2], isoFull[3]);

  // YYYY-MM-DD
  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) return toExpiryISO(ymd[1], ymd[2], ymd[3]);

  // YYYY/MM/DD or YYYY.MM.DD
  const ymdAlt = s.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/);
  if (ymdAlt) return toExpiryISO(ymdAlt[1], ymdAlt[2], ymdAlt[3]);

  // MM/DD/YYYY or M/D/YYYY (American slash)
  const mdySlash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdySlash) return toExpiryISO(mdySlash[3], mdySlash[1], mdySlash[2]);

  // MM-DD-YYYY or M-D-YYYY (4-digit year at end)
  const mdyDash = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (mdyDash) return toExpiryISO(mdyDash[3], mdyDash[1], mdyDash[2]);

  // "Month DD, YYYY" or "Month DD YYYY" — "June 1, 2026"
  const monthFirst = s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (monthFirst) {
    const m = MONTH_MAP[monthFirst[1].toLowerCase()];
    if (m) return toExpiryISO(monthFirst[3], m, monthFirst[2]);
  }

  // "DD Month YYYY" — "1 June 2026"
  const dayFirst = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (dayFirst) {
    const m = MONTH_MAP[dayFirst[2].toLowerCase()];
    if (m) return toExpiryISO(dayFirst[3], m, dayFirst[1]);
  }

  return null;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export function parseInventoryCSV(csv: string): { items: NewInventoryItem[]; skipped: number } {
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { items: [], skipped: 0 };

  const header = parseCSVLine(lines[0]).map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());
  const items: NewInventoryItem[] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    try {
      const cols = parseCSVLine(lines[i]);
      const get = (col: string): string => {
        const idx = header.indexOf(col);
        return idx >= 0 ? (cols[idx] ?? '').replace(/^"|"$/g, '').trim() : '';
      };

      const name = get('name');
      const rawExpiry = get('expires_at') || get('expiresat');
      if (!name || !rawExpiry) { skipped++; continue; }

      const location = get('location');
      if (!['fridge', 'freezer', 'pantry'].includes(location)) { skipped++; continue; }

      const expiresAt = normalizeDate(rawExpiry);
      if (!expiresAt) { skipped++; continue; }

      const rawThreshold = get('depletion_threshold');
      const rawShelf = get('shelf_life_days');

      items.push({
        name,
        quantity: Math.max(1, Number(get('quantity')) || 1),
        location: location as StorageLocation,
        barcode: get('barcode') || null,
        expiresAt,
        shelfLifeDays: rawShelf ? Math.max(1, Number(rawShelf) || 1) : undefined,
        category: get('category') || null,
        depletionThreshold: rawThreshold ? Number(rawThreshold) || null : null,
        tags: get('tags') ? get('tags').split(';').map((t) => t.trim()).filter(Boolean) : []
      });
    } catch {
      skipped++;
    }
  }

  return { items, skipped };
}

export async function importInventoryItemsFromCSV(
  csv: string
): Promise<{ imported: number; skipped: number }> {
  const { items, skipped } = parseInventoryCSV(csv);
  let imported = 0;
  for (const item of items) {
    await createInventoryItem(item);
    imported++;
  }
  return { imported, skipped };
}

export async function importInventoryItems(items: InventoryItem[]): Promise<number> {
  let count = 0;
  for (const item of items) {
    const sanitized: InventoryItem = {
      ...item,
      category: item.category ?? null,
      depletionThreshold: item.depletionThreshold ?? null,
      tags: item.tags ?? []
    };
    await upsertInventoryItem(sanitized);
    count++;
  }
  return count;
}
