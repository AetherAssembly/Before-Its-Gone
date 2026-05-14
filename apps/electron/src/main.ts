import path from 'node:path';
import { app, BrowserWindow, ipcMain } from 'electron';

const isDevelopment = !app.isPackaged;

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
    minWidth: 900,
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
