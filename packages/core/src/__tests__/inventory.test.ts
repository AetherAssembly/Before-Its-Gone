import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  calculateExpiryDateISO,
  calculateExpiryStatus,
  clearWasteLog,
  createInventoryItem,
  decrementItemQuantity,
  deleteInventoryItem,
  exportInventoryAsCSV,
  exportInventoryAsJSON,
  getFilteredInventory,
  getShoppingList,
  getWasteLog,
  importInventoryItems,
  importInventoryItemsFromCSV,
  incrementItemQuantity,
  logWastedItem,
  parseInventoryCSV,
  parseInventoryJSON,
  updateInventoryItem,
} from '../inventory';
import type { InventoryItem } from '../models';

vi.mock('../storage', () => ({
  listInventoryItems: vi.fn(),
  upsertInventoryItem: vi.fn(),
  removeInventoryItem: vi.fn(),
  clearAllInventoryItems: vi.fn(),
  getBarcodeProfile: vi.fn(),
  listBarcodeProfiles: vi.fn(),
  upsertBarcodeProfile: vi.fn(),
  getItemHistory: vi.fn(),
  listItemHistory: vi.fn(),
  upsertItemHistory: vi.fn(),
  addWasteLogEntry: vi.fn(),
  listWasteLogEntries: vi.fn(),
  clearWasteLogEntries: vi.fn(),
}));

import * as storage from '../storage';

const mockListInventoryItems = vi.mocked(storage.listInventoryItems);
const mockUpsertInventoryItem = vi.mocked(storage.upsertInventoryItem);
const mockRemoveInventoryItem = vi.mocked(storage.removeInventoryItem);
const mockGetItemHistory = vi.mocked(storage.getItemHistory);
const mockUpsertItemHistory = vi.mocked(storage.upsertItemHistory);

function makeItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'item-1',
    name: 'Milk',
    quantity: 2,
    location: 'fridge',
    barcode: null,
    expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    shelfLifeDays: 7,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: 'dairy',
    depletionThreshold: null,
    tags: [],
    recurring: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// calculateExpiryStatus
// ---------------------------------------------------------------------------

describe('calculateExpiryStatus', () => {
  const now = new Date('2025-01-10T12:00:00Z');

  it('returns fresh for a date well in the future', () => {
    const future = new Date('2025-01-20T12:00:00Z').toISOString();
    expect(calculateExpiryStatus(future, 2, now)).toBe('fresh');
  });

  it('returns expiring-soon when within the warning window', () => {
    const almostExpired = new Date('2025-01-11T12:00:00Z').toISOString();
    expect(calculateExpiryStatus(almostExpired, 2, now)).toBe('expiring-soon');
  });

  it('returns expired for a date in the past', () => {
    const past = new Date('2025-01-09T12:00:00Z').toISOString();
    expect(calculateExpiryStatus(past, 2, now)).toBe('expired');
  });

  it('returns fresh for an invalid date string', () => {
    expect(calculateExpiryStatus('not-a-date', 2, now)).toBe('fresh');
  });

  it('respects a custom warningWindowDays', () => {
    const inFiveDays = new Date('2025-01-15T12:00:00Z').toISOString();
    expect(calculateExpiryStatus(inFiveDays, 7, now)).toBe('expiring-soon');
    expect(calculateExpiryStatus(inFiveDays, 2, now)).toBe('fresh');
  });

  it('returns expiring-soon exactly at the boundary', () => {
    const boundary = new Date(now.getTime() + 2 * 86_400_000).toISOString();
    expect(calculateExpiryStatus(boundary, 2, now)).toBe('expiring-soon');
  });
});

// ---------------------------------------------------------------------------
// getShoppingList
// ---------------------------------------------------------------------------

describe('getShoppingList', () => {
  it('includes items at or below their depletion threshold', () => {
    const items = [
      makeItem({ id: '1', name: 'Milk', quantity: 1, depletionThreshold: 1 }),
      makeItem({ id: '2', name: 'Eggs', quantity: 2, depletionThreshold: 3 }),
      makeItem({ id: '3', name: 'Bread', quantity: 5, depletionThreshold: 2 }),
    ];
    const result = getShoppingList(items);
    expect(result.map((i) => i.id)).toEqual(['2', '1']);
  });

  it('excludes items with null depletionThreshold', () => {
    const items = [
      makeItem({ id: '1', name: 'Milk', quantity: 0, depletionThreshold: null }),
    ];
    expect(getShoppingList(items)).toHaveLength(0);
  });

  it('sorts results alphabetically by name', () => {
    const items = [
      makeItem({ id: '1', name: 'Yogurt', quantity: 0, depletionThreshold: 1 }),
      makeItem({ id: '2', name: 'Apple', quantity: 0, depletionThreshold: 1 }),
      makeItem({ id: '3', name: 'Milk', quantity: 0, depletionThreshold: 1 }),
    ];
    const result = getShoppingList(items);
    expect(result.map((i) => i.name)).toEqual(['Apple', 'Milk', 'Yogurt']);
  });

  it('returns an empty list when no items are depleted', () => {
    const items = [makeItem({ quantity: 10, depletionThreshold: 2 })];
    expect(getShoppingList(items)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getFilteredInventory
// ---------------------------------------------------------------------------

describe('getFilteredInventory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListInventoryItems.mockResolvedValue([
      makeItem({ id: '1', name: 'Milk', location: 'fridge', category: 'dairy', tags: ['organic'] }),
      makeItem({ id: '2', name: 'Chicken', location: 'freezer', category: 'meat', tags: ['organic', 'frozen'] }),
      makeItem({ id: '3', name: 'Pasta', location: 'pantry', category: 'grains', tags: [] }),
    ]);
  });

  it('returns all items with no filters', async () => {
    const result = await getFilteredInventory({});
    expect(result).toHaveLength(3);
  });

  it('filters by location', async () => {
    const result = await getFilteredInventory({ location: 'fridge' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by search term (name, case-insensitive)', async () => {
    const result = await getFilteredInventory({ search: 'milk' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by search term matching category', async () => {
    const result = await getFilteredInventory({ search: 'meat' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('applies AND semantics for tag filtering', async () => {
    const result = await getFilteredInventory({ tags: ['organic', 'frozen'] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('returns nothing when tag filter matches no items', async () => {
    const result = await getFilteredInventory({ tags: ['vegan'] });
    expect(result).toHaveLength(0);
  });

  it('sorts ascending by name', async () => {
    const result = await getFilteredInventory({ sortField: 'name', sortDirection: 'asc' });
    expect(result.map((i) => i.name)).toEqual(['Chicken', 'Milk', 'Pasta']);
  });

  it('sorts descending by name', async () => {
    const result = await getFilteredInventory({ sortField: 'name', sortDirection: 'desc' });
    expect(result.map((i) => i.name)).toEqual(['Pasta', 'Milk', 'Chicken']);
  });
});

// ---------------------------------------------------------------------------
// createInventoryItem
// ---------------------------------------------------------------------------

describe('createInventoryItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsertInventoryItem.mockResolvedValue(undefined);
    mockGetItemHistory.mockResolvedValue(null);
    mockUpsertItemHistory.mockResolvedValue(undefined);
  });

  it('returns an item with id, createdAt, and updatedAt populated', async () => {
    const result = await createInventoryItem({
      name: 'Butter',
      quantity: 1,
      location: 'fridge',
      expiresAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
    });

    expect(result.id).toBeTruthy();
    expect(result.createdAt).toBeTruthy();
    expect(result.updatedAt).toBeTruthy();
    expect(result.name).toBe('Butter');
  });

  it('defaults optional fields correctly', async () => {
    const result = await createInventoryItem({
      name: 'Butter',
      quantity: 1,
      location: 'fridge',
      expiresAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
    });

    expect(result.barcode).toBeNull();
    expect(result.category).toBeNull();
    expect(result.depletionThreshold).toBeNull();
    expect(result.tags).toEqual([]);
    expect(result.recurring).toBe(false);
  });

  it('calls upsertInventoryItem with the constructed item', async () => {
    const result = await createInventoryItem({
      name: 'Butter',
      quantity: 2,
      location: 'fridge',
      expiresAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
    });

    expect(mockUpsertInventoryItem).toHaveBeenCalledOnce();
    expect(mockUpsertInventoryItem).toHaveBeenCalledWith(result);
  });

  it('uses provided shelfLifeDays when given', async () => {
    const result = await createInventoryItem({
      name: 'Butter',
      quantity: 1,
      location: 'fridge',
      expiresAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
      shelfLifeDays: 14,
    });
    expect(result.shelfLifeDays).toBe(14);
  });
});

// ---------------------------------------------------------------------------
// decrementItemQuantity
// ---------------------------------------------------------------------------

describe('decrementItemQuantity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsertInventoryItem.mockResolvedValue(undefined);
  });

  it('decrements quantity by 1', async () => {
    mockListInventoryItems.mockResolvedValue([makeItem({ id: 'x', quantity: 5 })]);
    const { item } = await decrementItemQuantity('x');
    expect(item?.quantity).toBe(4);
  });

  it('does not go below 0', async () => {
    mockListInventoryItems.mockResolvedValue([makeItem({ id: 'x', quantity: 0 })]);
    const { item } = await decrementItemQuantity('x');
    expect(item?.quantity).toBe(0);
  });

  it('returns depleted: true when quantity crosses the threshold', async () => {
    mockListInventoryItems.mockResolvedValue([
      makeItem({ id: 'x', quantity: 2, depletionThreshold: 1 }),
    ]);
    const { depleted } = await decrementItemQuantity('x');
    expect(depleted).toBe(true);
  });

  it('returns depleted: false when still above threshold', async () => {
    mockListInventoryItems.mockResolvedValue([
      makeItem({ id: 'x', quantity: 5, depletionThreshold: 2 }),
    ]);
    const { depleted } = await decrementItemQuantity('x');
    expect(depleted).toBe(false);
  });

  it('returns { item: null, depleted: false } for an unknown id', async () => {
    mockListInventoryItems.mockResolvedValue([]);
    const result = await decrementItemQuantity('unknown');
    expect(result).toEqual({ item: null, depleted: false });
  });

  it('saves the updated item to storage', async () => {
    mockListInventoryItems.mockResolvedValue([makeItem({ id: 'x', quantity: 3 })]);
    await decrementItemQuantity('x');
    expect(mockUpsertInventoryItem).toHaveBeenCalledOnce();
    const saved = mockUpsertInventoryItem.mock.calls[0][0];
    expect(saved.quantity).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// updateInventoryItem
// ---------------------------------------------------------------------------

describe('updateInventoryItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsertInventoryItem.mockResolvedValue(undefined);
  });

  it('returns null when the item does not exist', async () => {
    mockListInventoryItems.mockResolvedValue([]);
    const result = await updateInventoryItem('missing', { name: 'X' });
    expect(result).toBeNull();
  });

  it('merges patch fields and updates updatedAt', async () => {
    mockListInventoryItems.mockResolvedValue([makeItem({ id: 'y', name: 'Old Name' })]);
    const result = await updateInventoryItem('y', { name: 'New Name', quantity: 10 });
    expect(result?.name).toBe('New Name');
    expect(result?.quantity).toBe(10);
    expect(result?.updatedAt).toBeTruthy();
  });

  it('calls upsertInventoryItem with the merged item', async () => {
    mockListInventoryItems.mockResolvedValue([makeItem({ id: 'y' })]);
    await updateInventoryItem('y', { quantity: 7 });
    expect(mockUpsertInventoryItem).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// incrementItemQuantity
// ---------------------------------------------------------------------------

describe('incrementItemQuantity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsertInventoryItem.mockResolvedValue(undefined);
  });

  it('returns null when the item does not exist', async () => {
    mockListInventoryItems.mockResolvedValue([]);
    const result = await incrementItemQuantity('missing');
    expect(result).toBeNull();
  });

  it('increments quantity by 1 by default', async () => {
    mockListInventoryItems.mockResolvedValue([makeItem({ id: 'z', quantity: 3 })]);
    const result = await incrementItemQuantity('z');
    expect(result?.quantity).toBe(4);
  });

  it('increments by a custom amount', async () => {
    mockListInventoryItems.mockResolvedValue([makeItem({ id: 'z', quantity: 3 })]);
    const result = await incrementItemQuantity('z', 5);
    expect(result?.quantity).toBe(8);
  });

  it('clamps fractional by values to at least 1', async () => {
    mockListInventoryItems.mockResolvedValue([makeItem({ id: 'z', quantity: 3 })]);
    const result = await incrementItemQuantity('z', 0.1);
    expect(result?.quantity).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// deleteInventoryItem
// ---------------------------------------------------------------------------

describe('deleteInventoryItem', () => {
  it('calls removeInventoryItem with the given id', async () => {
    mockRemoveInventoryItem.mockResolvedValue(undefined);
    await deleteInventoryItem('abc');
    expect(mockRemoveInventoryItem).toHaveBeenCalledWith('abc');
  });
});

// ---------------------------------------------------------------------------
// calculateExpiryDateISO
// ---------------------------------------------------------------------------

describe('calculateExpiryDateISO', () => {
  it('returns an ISO string shelfLifeDays in the future', () => {
    const from = new Date('2025-03-01T00:00:00Z');
    const result = calculateExpiryDateISO(7, from);
    expect(result).toBe(new Date('2025-03-08T00:00:00Z').toISOString());
  });

  it('clamps shelf life to at least 1 day', () => {
    const from = new Date('2025-03-01T00:00:00Z');
    const result = calculateExpiryDateISO(0, from);
    expect(result).toBe(new Date('2025-03-02T00:00:00Z').toISOString());
  });

  it('floors fractional days', () => {
    const from = new Date('2025-03-01T00:00:00Z');
    const result = calculateExpiryDateISO(1.9, from);
    expect(result).toBe(new Date('2025-03-02T00:00:00Z').toISOString());
  });
});

// ---------------------------------------------------------------------------
// getFilteredInventory — additional sort coverage
// ---------------------------------------------------------------------------

describe('getFilteredInventory (sort by createdAt)', () => {
  it('sorts ascending by createdAt', async () => {
    vi.clearAllMocks();
    mockListInventoryItems.mockResolvedValue([
      makeItem({ id: '1', name: 'B', createdAt: '2025-01-02T00:00:00Z' }),
      makeItem({ id: '2', name: 'A', createdAt: '2025-01-01T00:00:00Z' }),
    ]);
    const result = await getFilteredInventory({ sortField: 'createdAt', sortDirection: 'asc' });
    expect(result[0].id).toBe('2');
    expect(result[1].id).toBe('1');
  });

  it('sorts descending by createdAt', async () => {
    vi.clearAllMocks();
    mockListInventoryItems.mockResolvedValue([
      makeItem({ id: '1', name: 'B', createdAt: '2025-01-01T00:00:00Z' }),
      makeItem({ id: '2', name: 'A', createdAt: '2025-01-02T00:00:00Z' }),
    ]);
    const result = await getFilteredInventory({ sortField: 'createdAt', sortDirection: 'desc' });
    expect(result[0].id).toBe('2');
  });
});

// ---------------------------------------------------------------------------
// exportInventoryAsJSON
// ---------------------------------------------------------------------------

describe('exportInventoryAsJSON', () => {
  it('serializes items to a JSON string with version=1', () => {
    const items = [makeItem({ id: 'a', name: 'Milk' })];
    const json = exportInventoryAsJSON(items);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0].name).toBe('Milk');
  });

  it('returns valid JSON for an empty array', () => {
    const json = exportInventoryAsJSON([]);
    const parsed = JSON.parse(json);
    expect(parsed.items).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// exportInventoryAsCSV
// ---------------------------------------------------------------------------

describe('exportInventoryAsCSV', () => {
  it('includes a header row and one data row per item', () => {
    const items = [makeItem({ name: 'Milk', barcode: '12345', category: 'dairy' })];
    const csv = exportInventoryAsCSV(items);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('name');
    expect(lines[1]).toContain('Milk');
    expect(lines[1]).toContain('12345');
    expect(lines[1]).toContain('dairy');
  });

  it('uses empty string when barcode or category is null', () => {
    const items = [makeItem({ barcode: null, category: null })];
    const csv = exportInventoryAsCSV(items);
    const lines = csv.split('\n');
    const cols = lines[1].split(',');
    expect(cols[3]).toBe('');
    expect(cols[5]).toBe('');
  });

  it('escapes double quotes in names', () => {
    const items = [makeItem({ name: 'Say "Hello"' })];
    const csv = exportInventoryAsCSV(items);
    expect(csv).toContain('Say ""Hello""');
  });
});

// ---------------------------------------------------------------------------
// parseInventoryJSON
// ---------------------------------------------------------------------------

describe('parseInventoryJSON', () => {
  it('parses valid JSON export and returns items', () => {
    const items = [makeItem({ id: 'a', name: 'Milk' })];
    const json = exportInventoryAsJSON(items);
    const result = parseInventoryJSON(json);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Milk');
  });

  it('filters out entries missing id or name', () => {
    const json = JSON.stringify({ version: 1, items: [{ id: 'a' }, { name: 'X' }, makeItem()] });
    const result = parseInventoryJSON(json);
    expect(result).toHaveLength(1);
  });

  it('handles missing items array gracefully', () => {
    const json = JSON.stringify({ version: 1 });
    const result = parseInventoryJSON(json);
    expect(result).toEqual([]);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseInventoryJSON('not json')).toThrow();
  });
});

// ---------------------------------------------------------------------------
// parseInventoryCSV
// ---------------------------------------------------------------------------

describe('parseInventoryCSV', () => {
  const validHeader = 'name,quantity,location,barcode,expires_at,category\n';

  it('returns empty when CSV has no data rows', () => {
    const result = parseInventoryCSV('name,quantity\n');
    expect(result.items).toHaveLength(0);
    expect(result.skipped).toBe(0);
  });

  it('parses a valid row', () => {
    const csv = `${validHeader}Milk,2,fridge,123,2025-12-01,dairy`;
    const { items, skipped } = parseInventoryCSV(csv);
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Milk');
    expect(items[0].quantity).toBe(2);
    expect(skipped).toBe(0);
  });

  it('skips rows with missing name or expiry', () => {
    const csv = `${validHeader},2,fridge,,2025-12-01,`;
    const { items, skipped } = parseInventoryCSV(csv);
    expect(items).toHaveLength(0);
    expect(skipped).toBe(1);
  });

  it('skips rows with an invalid location', () => {
    const csv = `${validHeader}Milk,2,garage,,2025-12-01,`;
    const { items, skipped } = parseInventoryCSV(csv);
    expect(items).toHaveLength(0);
    expect(skipped).toBe(1);
  });

  it('handles quoted fields with commas', () => {
    const csv = `${validHeader}"Milk, 2%",1,fridge,,2025-12-01,`;
    const { items } = parseInventoryCSV(csv);
    expect(items[0].name).toBe('Milk, 2%');
  });

  it('applies depletion threshold and shelf life when present', () => {
    const csv = 'name,quantity,location,expires_at,shelf_life_days,depletion_threshold\nMilk,3,fridge,2025-12-01,7,2';
    const { items } = parseInventoryCSV(csv);
    expect(items[0].shelfLifeDays).toBe(7);
    expect(items[0].depletionThreshold).toBe(2);
  });

  it('parses tags separated by semicolons', () => {
    const csv = 'name,quantity,location,expires_at,tags\nMilk,1,fridge,2025-12-01,organic;local';
    const { items } = parseInventoryCSV(csv);
    expect(items[0].tags).toEqual(['organic', 'local']);
  });
});

// ---------------------------------------------------------------------------
// importInventoryItems
// ---------------------------------------------------------------------------

describe('importInventoryItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsertInventoryItem.mockResolvedValue(undefined);
  });

  it('upserts each item and returns the count', async () => {
    const items = [makeItem({ id: '1' }), makeItem({ id: '2' })];
    const count = await importInventoryItems(items);
    expect(count).toBe(2);
    expect(mockUpsertInventoryItem).toHaveBeenCalledTimes(2);
  });

  it('fills in null for missing category/depletionThreshold', async () => {
    const item = { ...makeItem({ id: '3' }), category: undefined as unknown as null, depletionThreshold: undefined as unknown as null, tags: undefined as unknown as [] };
    await importInventoryItems([item]);
    const saved = mockUpsertInventoryItem.mock.calls[0][0];
    expect(saved.category).toBeNull();
    expect(saved.depletionThreshold).toBeNull();
    expect(saved.tags).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// importInventoryItemsFromCSV
// ---------------------------------------------------------------------------

describe('importInventoryItemsFromCSV', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsertInventoryItem.mockResolvedValue(undefined);
    mockGetItemHistory.mockResolvedValue(null);
    mockUpsertItemHistory.mockResolvedValue(undefined);
  });

  it('imports valid rows and reports count', async () => {
    const csv = 'name,quantity,location,expires_at\nMilk,1,fridge,2025-12-01\nEggs,12,fridge,2025-11-30';
    const { imported, skipped } = await importInventoryItemsFromCSV(csv);
    expect(imported).toBe(2);
    expect(skipped).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// logWastedItem / getWasteLog / clearWasteLog
// ---------------------------------------------------------------------------

describe('waste log functions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('logWastedItem creates a waste entry with correct fields', async () => {
    const mockAddWaste = vi.mocked(storage.addWasteLogEntry);
    mockAddWaste.mockResolvedValue(undefined);
    const item = makeItem({ name: 'Cheese', quantity: 3 });
    const entry = await logWastedItem(item);
    expect(entry.itemName).toBe('Cheese');
    expect(entry.quantity).toBe(3);
    expect(entry.id).toBeTruthy();
    expect(mockAddWaste).toHaveBeenCalledWith(entry);
  });

  it('getWasteLog returns entries sorted by wastedAt descending', async () => {
    vi.mocked(storage.listWasteLogEntries).mockResolvedValue([
      { id: '1', itemName: 'A', quantity: 1, location: 'fridge', category: null, expiresAt: '', wastedAt: '2025-01-01T00:00:00Z' },
      { id: '2', itemName: 'B', quantity: 1, location: 'fridge', category: null, expiresAt: '', wastedAt: '2025-01-03T00:00:00Z' },
    ]);
    const result = await getWasteLog();
    expect(result[0].id).toBe('2');
  });

  it('clearWasteLog calls clearWasteLogEntries', async () => {
    const mockClear = vi.mocked(storage.clearWasteLogEntries);
    mockClear.mockResolvedValue(undefined);
    await clearWasteLog();
    expect(mockClear).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// createInventoryItem — recordItemHistory branch (existing history)
// ---------------------------------------------------------------------------

describe('createInventoryItem with existing item history', () => {
  it('increments useCount on an existing history entry', async () => {
    vi.clearAllMocks();
    mockUpsertInventoryItem.mockResolvedValue(undefined);
    mockGetItemHistory.mockResolvedValue({
      id: 'milk',
      name: 'Milk',
      barcode: null,
      location: 'fridge',
      shelfLifeDays: 7,
      category: null,
      lastUsedAt: new Date().toISOString(),
      useCount: 3,
    });
    mockUpsertItemHistory.mockResolvedValue(undefined);

    await createInventoryItem({
      name: 'Milk',
      quantity: 1,
      location: 'fridge',
      expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    });

    const saved = mockUpsertItemHistory.mock.calls[0][0];
    expect(saved.useCount).toBe(4);
  });
});
