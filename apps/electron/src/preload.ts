import { contextBridge, ipcRenderer } from 'electron';
import type { PhoneSavePayload } from './scanner-server.js';

contextBridge.exposeInMainWorld('beforeItsGone', {
  getAppVersion: () => ipcRenderer.invoke('app:version') as Promise<string>,
  ping: () => ipcRenderer.invoke('app:ping') as Promise<string>,
  getPlatform: () => ipcRenderer.invoke('app:platform') as Promise<string>,
  startBarcodeServer: () =>
    ipcRenderer.invoke('scanner:start') as Promise<{ url: string; qrDataUrl: string }>,
  stopBarcodeServer: () => ipcRenderer.invoke('scanner:stop') as Promise<void>,
  onBarcodeScanned: (cb: (barcode: string) => void) => {
    ipcRenderer.removeAllListeners('scanner:barcode-received');
    ipcRenderer.on('scanner:barcode-received', (_e, barcode: string) => cb(barcode));
  },
  onSaveItemFromPhone: (cb: (data: PhoneSavePayload) => Promise<void>) => {
    ipcRenderer.removeAllListeners('scanner:do-save');
    ipcRenderer.on('scanner:do-save', (_e, data: PhoneSavePayload) => {
      cb(data).then(
        () => { void ipcRenderer.invoke('scanner:save-done'); },
        () => { void ipcRenderer.invoke('scanner:save-error', 'Save failed in renderer'); }
      );
    });
  }
});
