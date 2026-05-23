export type StorageLocation = 'fridge' | 'freezer' | 'pantry' | (string & {});

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
  shelfLifeDays?: number;
  createdAt: string;
  updatedAt: string;
  category: string | null;
  depletionThreshold: number | null;
  tags: string[];
  recurring?: boolean;
  restockQuantity?: number;
}

export interface NewInventoryItem {
  name: string;
  quantity: number;
  location: StorageLocation;
  barcode?: string | null;
  expiresAt: string;
  shelfLifeDays?: number;
  category?: string | null;
  depletionThreshold?: number | null;
  tags?: string[];
  recurring?: boolean;
  restockQuantity?: number;
}

export interface WasteLogEntry {
  id: string;
  itemName: string;
  quantity: number;
  location: StorageLocation;
  category: string | null;
  expiresAt: string;
  wastedAt: string;
}

export interface BarcodeProfile {
  barcode: string;
  productName: string;
  defaultShelfLifeDays: number;
  preferredLocation: StorageLocation;
  updatedAt: string;
  caloriesPer100g?: number | null;
  allergens?: string[];
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

export interface AppSettings {
  defaultLocation: StorageLocation;
  defaultShelfLifeDays: number;
  expiryWarningDays: number;
  customLocations: string[];
  notifications: {
    expiring: boolean;
    expired: boolean;
    lowStock: boolean;
  };
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultLocation: 'fridge',
  defaultShelfLifeDays: 7,
  expiryWarningDays: 2,
  customLocations: [],
  notifications: {
    expiring: true,
    expired: true,
    lowStock: true,
  },
};

export const SETTINGS_STORAGE_KEY = 'before-its-gone.settings';
