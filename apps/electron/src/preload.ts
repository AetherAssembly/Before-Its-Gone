import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('beforeItsGone', {
  getAppVersion: () => ipcRenderer.invoke('app:version') as Promise<string>,
  ping: () => ipcRenderer.invoke('app:ping') as Promise<string>,
  getPlatform: () => ipcRenderer.invoke('app:platform') as Promise<string>,
  startBarcodeServer: () =>
    ipcRenderer.invoke('scanner:start') as Promise<{ url: string; qrDataUrl: string }>,
  stopBarcodeServer: () => ipcRenderer.invoke('scanner:stop') as Promise<void>,
  onBarcodeScanned: (cb: (barcode: string) => void) => {
    ipcRenderer.removeAllListeners('scanner:barcode-received');
    ipcRenderer.once('scanner:barcode-received', (_e, barcode: string) => cb(barcode));
  }
});
