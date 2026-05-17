/// <reference types="vite/client" />

type PhoneSavePayload = {
  barcode: string;
  name: string;
  quantity: number;
  location: 'fridge' | 'freezer' | 'pantry';
  category: string | null;
  shelfLifeDays: number;
};

interface Window {
  beforeItsGone?: {
    getAppVersion(): Promise<string>;
    ping(): Promise<string>;
    getPlatform(): Promise<string>;
    startBarcodeServer?(): Promise<{ url: string; qrDataUrl: string }>;
    stopBarcodeServer?(): Promise<void>;
    onBarcodeScanned?(cb: (barcode: string) => void): void;
    onSaveItemFromPhone?(cb: (data: PhoneSavePayload) => Promise<void>): void;
  };
}
