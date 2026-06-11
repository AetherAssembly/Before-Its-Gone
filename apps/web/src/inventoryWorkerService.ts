import { wrap, type Remote } from 'comlink';
import type { InventoryService } from '@aetherAssembly/core';

let _service: Remote<InventoryService> | null = null;

export function getWorkerInventoryService(): Remote<InventoryService> {
  if (!_service) {
    const worker = new Worker(
      new URL('./inventory.worker.ts', import.meta.url),
      { type: 'module' }
    );
    _service = wrap<InventoryService>(worker);
  }
  return _service;
}
