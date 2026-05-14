export type StorageLocation = 'fridge' | 'freezer' | 'pantry';

export type ExpiryStatus = 'fresh' | 'expiring-soon' | 'expired';

export type SortField = 'expiresAt' | 'createdAt' | 'name';
export type SortDirection = 'asc' | 'desc';
export type FilterLocation = StorageLocation | 'all';

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  location: StorageLocation;
  barcode: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  category: string | null;
  depletionThreshold: number | null;
}

export interface NewInventoryItem {
  name: string;
  quantity: number;
  location: StorageLocation;
  barcode?: string | null;
  expiresAt: string;
  category?: string | null;
  depletionThreshold?: number | null;
}

export interface BarcodeProfile {
  barcode: string;
  productName: string;
  defaultShelfLifeDays: number;
  preferredLocation: StorageLocation;
  updatedAt: string;
}

export interface ItemHistory {
  id: string;
  name: string;
  barcode: string | null;
  location: StorageLocation;
  shelfLifeDays: number;
  category: string | null;
  lastUsedAt: string;
  useCount: number;
}
