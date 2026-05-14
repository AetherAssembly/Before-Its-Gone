import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('beforeItsGone', {
  getAppVersion: () => ipcRenderer.invoke('app:version') as Promise<string>,
  ping: () => ipcRenderer.invoke('app:ping') as Promise<string>,
  getPlatform: () => ipcRenderer.invoke('app:platform') as Promise<string>
});
