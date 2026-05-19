import {
  getFilteredInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  incrementItemQuantity,
  decrementItemQuantity,
  clearInventory,
  importInventoryItems,
  importInventoryItemsFromCSV,
  getFrequentItems,
  findBarcodeProfile,
  saveBarcodeProfile,
} from '../inventory.js';
import type {
  BarcodeProfile,
  FilterLocation,
  InventoryItem,
  ItemHistory,
  NewInventoryItem,
  SortDirection,
  SortField,
  StorageLocation,
} from '../models.js';

export class InventoryService {
  async list(options: {
    search?: string;
    location?: FilterLocation;
    sortField?: SortField;
    sortDirection?: SortDirection;
  } = {}): Promise<InventoryItem[]> {
    return getFilteredInventory(options);
  }

  async create(item: NewInventoryItem): Promise<InventoryItem> {
    return createInventoryItem(item);
  }

  async update(
    id: string,
    patch: Parameters<typeof updateInventoryItem>[1]
  ): Promise<InventoryItem | null> {
    return updateInventoryItem(id, patch);
  }

  async remove(id: string): Promise<void> {
    return deleteInventoryItem(id);
  }

  async increment(id: string, by = 1): Promise<InventoryItem | null> {
    return incrementItemQuantity(id, by);
  }

  async decrement(id: string): Promise<{ item: InventoryItem | null; depleted: boolean }> {
    return decrementItemQuantity(id);
  }

  async clear(): Promise<void> {
    return clearInventory();
  }

  async importJSON(items: InventoryItem[]): Promise<number> {
    return importInventoryItems(items);
  }

  async importCSV(csv: string): Promise<{ imported: number; skipped: number }> {
    return importInventoryItemsFromCSV(csv);
  }

  async frequentItems(limit = 5): Promise<ItemHistory[]> {
    return getFrequentItems(limit);
  }

  async findProfile(barcode: string): Promise<BarcodeProfile | null> {
    return findBarcodeProfile(barcode);
  }

  async saveProfile(input: {
    barcode: string;
    productName: string;
    defaultShelfLifeDays: number;
    preferredLocation: StorageLocation;
  }): Promise<BarcodeProfile> {
    return saveBarcodeProfile(input);
  }
}

export const inventoryService = new InventoryService();
