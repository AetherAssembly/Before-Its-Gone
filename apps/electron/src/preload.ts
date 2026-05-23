import { contextBridge, ipcRenderer } from 'electron';
import type { PhoneSavePayload } from './scanner-server.js';
import type { EmailSettings } from './email-service.js';

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
  },
  onUpdateAvailable: (cb: (info: { version: string; isLinuxPackage: boolean }) => void) => {
    ipcRenderer.removeAllListeners('updater:available');
    ipcRenderer.on('updater:available', (_e, info) => cb(info as { version: string; isLinuxPackage: boolean }));
  },
  onUpdateDownloaded: (cb: (info: { version: string }) => void) => {
    ipcRenderer.removeAllListeners('updater:downloaded');
    ipcRenderer.on('updater:downloaded', (_e, info) => cb(info as { version: string }));
  },
  onUpdateError: (cb: (msg: string) => void) => {
    ipcRenderer.removeAllListeners('updater:error');
    ipcRenderer.on('updater:error', (_e, msg) => cb(msg as string));
  },
  installUpdate: () => ipcRenderer.invoke('updater:install') as Promise<void>,
  downloadUpdate: () => ipcRenderer.invoke('updater:download') as Promise<void>,
  getEmailSettings: () => ipcRenderer.invoke('email:get-settings') as Promise<EmailSettings>,
  saveEmailSettings: (settings: EmailSettings) => ipcRenderer.invoke('email:save-settings', settings) as Promise<void>,
  sendEmail: (payload: { subject: string; html: string }) => ipcRenderer.invoke('email:send', payload) as Promise<void>,
  onDigestFire: (cb: () => void) => {
    ipcRenderer.removeAllListeners('email:digest-fire');
    ipcRenderer.on('email:digest-fire', () => cb());
  },
});
