/// <reference types="vite/client" />

type PhoneSavePayload = {
  barcode: string;
  name: string;
  quantity: number;
  location: 'fridge' | 'freezer' | 'pantry';
  category: string | null;
  shelfLifeDays: number;
  expiresAt: string | null;
};

type EmailSettings = {
  provider: 'none' | 'resend' | 'smtp';
  to: string;
  resendApiKey: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpTls: boolean;
  digest: 'never' | 'daily' | 'weekly';
  digestTime: string;
  paused: boolean;
  resumeAt: string | null;
  lastSentAt: string | null;
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
    onUpdateAvailable?(cb: (info: { version: string; isLinuxPackage: boolean }) => void): void;
    onUpdateDownloaded?(cb: (info: { version: string }) => void): void;
    onUpdateError?(cb: (msg: string) => void): void;
    installUpdate?(): Promise<void>;
    downloadUpdate?(): Promise<void>;
    getEmailSettings?(): Promise<EmailSettings>;
    saveEmailSettings?(settings: EmailSettings): Promise<void>;
    sendEmail?(payload: { subject: string; html: string }): Promise<void>;
    onDigestFire?(cb: () => void): void;
  };
}

interface ImportMeta {
  readonly env: {
    readonly VITE_APP_VERSION: string;
  } & Record<string, string | boolean | undefined>;
}
