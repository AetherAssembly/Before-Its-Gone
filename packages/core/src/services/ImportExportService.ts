import {
  exportInventoryAsJSON,
  exportInventoryAsCSV,
  parseInventoryJSON,
} from '../inventory.js';
import type { InventoryItem } from '../models.js';

export class ImportExportService {
  toJSON(items: InventoryItem[]): string {
    return exportInventoryAsJSON(items);
  }

  toCSV(items: InventoryItem[]): string {
    return exportInventoryAsCSV(items);
  }

  parseJSON(raw: string): InventoryItem[] {
    return parseInventoryJSON(raw);
  }
}

export const importExportService = new ImportExportService();
