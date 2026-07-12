import path from 'node:path';
import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import { startScannerServer, stopScannerServer } from './scanner-server.js';
import {
  DigestScheduler,
  readEmailSettings,
  sendEmail,
  writeEmailSettings,
} from './email-service.js';

const isDevelopment = !app.isPackaged;

let pendingSaveResolve: (() => void) | null = null;
let pendingSaveReject: ((err: Error) => void) | null = null;
let scannerSaveLock = false;
const digestScheduler = new DigestScheduler();

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

app.setAppUserModelId('com.beforeitsgone.app');

autoUpdater.autoDownload = true;
autoUpdater.allowDowngrade = false;

// Route beta builds to the beta update channel so they only receive
// beta updates and don't accidentally pull stable releases.
if (app.getVersion().includes('-beta')) {
  autoUpdater.channel = 'beta';
  autoUpdater.allowPrerelease = true;
}

performance.mark('main-init-start');

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
    title: "Before It's Gone",
    icon: path.resolve(__dirname, '../assets/app-icon.png'),
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

  window.webContents.once('did-finish-load', () => {
    const measure = performance.measure('startup', 'main-init-start');
    if (isDevelopment) {
      console.log(`[startup] renderer ready in ${Math.round(measure.duration)} ms`);
    }
  });
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
        if (scannerSaveLock) throw new Error('A save is already in progress');
        scannerSaveLock = true;
        const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
        if (!win) { scannerSaveLock = false; throw new Error('No window available to save item'); }

        try {
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
        } finally {
          scannerSaveLock = false;
        }
      },
      app.getPath('userData')
    );

    const url = `https://${lanIp}:${port}/?token=${token}`;
    const { default: QRCode } = await import('qrcode');
    const qrDataUrl = await QRCode.toDataURL(url, { width: 256, margin: 1 });
    return { url, qrDataUrl };
  });

  ipcMain.handle('scanner:stop', () => { stopScannerServer(); });

  createWindow();

  const mainWindow = BrowserWindow.getAllWindows()[0];

  const isLinuxPackage = process.platform === 'linux' && !process.env.APPIMAGE;
  if (isLinuxPackage) autoUpdater.autoDownload = false;

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('updater:available', { version: info.version, isLinuxPackage });
  });
  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('updater:downloaded', { version: info.version });
  });
  autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('updater:error', err.message);
  });

  ipcMain.handle('updater:install', () => { autoUpdater.quitAndInstall(); });
  ipcMain.handle('updater:download', () => autoUpdater.downloadUpdate());

  const userDataDir = app.getPath('userData');

  ipcMain.handle('email:get-settings', () => readEmailSettings(userDataDir));

  ipcMain.handle('email:save-settings', (_e, settings: unknown) => {
    writeEmailSettings(userDataDir, settings as import('./email-service.js').EmailSettings);
  });

  ipcMain.handle('email:send', async (_e, payload: { subject: string; html: string }) => {
    const settings = readEmailSettings(userDataDir);
    if (!settings.to) throw new Error('No recipient configured.');
    await sendEmail(settings, { to: settings.to, subject: payload.subject, html: payload.html });
    const updated = { ...settings, lastSentAt: new Date().toISOString() };
    writeEmailSettings(userDataDir, updated);
  });

  digestScheduler.start(
    () => userDataDir,
    () => {
      const win = BrowserWindow.getAllWindows()[0];
      win?.webContents.send('email:digest-fire');
    }
  );

  if (app.isPackaged) {
    autoUpdater.checkForUpdates().catch(() => {});
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  digestScheduler.stop();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
