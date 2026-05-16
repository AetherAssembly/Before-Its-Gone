/// <reference types="vite/client" />

interface Window {
  beforeItsGone?: {
    getAppVersion(): Promise<string>;
    ping(): Promise<string>;
    getPlatform(): Promise<string>;
    startBarcodeServer?(): Promise<{ url: string; qrDataUrl: string }>;
    stopBarcodeServer?(): Promise<void>;
    onBarcodeScanned?(cb: (barcode: string) => void): void;
  };
}
