import path from 'node:path';
import { app, BrowserWindow, ipcMain } from 'electron';
import QRCode from 'qrcode';
import { startScannerServer, stopScannerServer } from './scanner-server.js';

const isDevelopment = !app.isPackaged;

let pendingSaveResolve: (() => void) | null = null;
let pendingSaveReject: ((err: Error) => void) | null = null;

function configureLinuxDisplayBackend(): void {
  if (process.platform !== 'linux') {
    return;
  }

  const requestedBackend = process.env.BIG_LINUX_DISPLAY_BACKEND;
  if (requestedBackend === 'x11') {
    app.commandLine.appendSwitch('ozone-platform', 'x11');
    return;
  }

  const isWaylandSession =
    process.env.XDG_SESSION_TYPE === 'wayland' ||
    Boolean(process.env.WAYLAND_DISPLAY);

  if (requestedBackend === 'wayland' || isWaylandSession) {
    app.commandLine.appendSwitch(
      'enable-features',
      'UseOzonePlatform,WaylandWindowDecorations'
    );
    app.commandLine.appendSwitch('ozone-platform-hint', 'auto');

    if (requestedBackend === 'wayland') {
      app.commandLine.appendSwitch('ozone-platform', 'wayland');
    }
  }
}

configureLinuxDisplayBackend();

function getRendererEntryPoint(): string {
  if (process.env.VITE_DEV_SERVER_URL) {
    return process.env.VITE_DEV_SERVER_URL;
  }

  if (isDevelopment) {
    return `file://${path.resolve(__dirname, '../../web/dist/index.html')}`;
  }

  return `file://${path.resolve(process.resourcesPath, 'web-dist/index.html')}`;
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 600,
    minHeight: 600,
    autoHideMenuBar: true,
    ...(process.platform === 'darwin' && {
      titleBarStyle: 'hiddenInset'
    }),
    webPreferences: {
      preload: path.resolve(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  void window.loadURL(getRendererEntryPoint());
}

app.whenReady().then(() => {
  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.handle('app:ping', () => 'pong');
  ipcMain.handle('app:platform', () => process.platform);

  ipcMain.handle('scanner:save-done', () => {
    pendingSaveResolve?.();
    pendingSaveResolve = null;
    pendingSaveReject = null;
  });

  ipcMain.handle('scanner:save-error', (_, message: string) => {
    pendingSaveReject?.(new Error(message));
    pendingSaveResolve = null;
    pendingSaveReject = null;
  });

  ipcMain.handle('scanner:start', async () => {
    const { port, token, lanIp } = await startScannerServer(
      (barcode) => {
        const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
        win?.webContents.send('scanner:barcode-received', barcode);
      },
      async (data) => {
        const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
        if (!win) throw new Error('No window available to save item');

        await new Promise<void>((resolve, reject) => {
          pendingSaveResolve = resolve;
          pendingSaveReject = reject;
          win.webContents.send('scanner:do-save', data);
          setTimeout(() => {
            pendingSaveReject?.(new Error('Save timeout'));
            pendingSaveResolve = null;
            pendingSaveReject = null;
          }, 10_000);
        });
      },
      app.getPath('userData')
    );

    const url = `https://${lanIp}:${port}/?token=${token}`;
    const qrDataUrl = await QRCode.toDataURL(url, { width: 256, margin: 1 });
    return { url, qrDataUrl };
  });

  ipcMain.handle('scanner:stop', () => { stopScannerServer(); });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
