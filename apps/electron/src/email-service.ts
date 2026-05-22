import fs from 'node:fs';
import path from 'node:path';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

export interface EmailSettings {
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
}

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  provider: 'none',
  to: '',
  resendApiKey: '',
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPass: '',
  smtpTls: true,
  digest: 'never',
  digestTime: '08:00',
  paused: false,
  resumeAt: null,
  lastSentAt: null,
};

function settingsPath(userDataDir: string): string {
  return path.join(userDataDir, 'email-settings.json');
}

export function readEmailSettings(userDataDir: string): EmailSettings {
  try {
    const raw = fs.readFileSync(settingsPath(userDataDir), 'utf-8');
    return { ...DEFAULT_EMAIL_SETTINGS, ...(JSON.parse(raw) as Partial<EmailSettings>) };
  } catch {
    return { ...DEFAULT_EMAIL_SETTINGS };
  }
}

export function writeEmailSettings(userDataDir: string, settings: EmailSettings): void {
  fs.writeFileSync(settingsPath(userDataDir), JSON.stringify(settings, null, 2), 'utf-8');
}

export async function sendEmail(
  settings: EmailSettings,
  payload: { to: string; subject: string; html: string }
): Promise<void> {
  if (settings.provider === 'resend') {
    if (!settings.resendApiKey) throw new Error('Resend API key not configured.');
    const resend = new Resend(settings.resendApiKey);
    const result = await resend.emails.send({
      from: 'Before Its Gone <notifications@beforeitsgone.local>',
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });
    if (result.error) throw new Error(result.error.message);
    return;
  }

  if (settings.provider === 'smtp') {
    if (!settings.smtpHost) throw new Error('SMTP host not configured.');
    const transport = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort || 587,
      secure: settings.smtpTls,
      auth: settings.smtpUser
        ? { user: settings.smtpUser, pass: settings.smtpPass }
        : undefined,
    });
    await transport.sendMail({
      from: settings.smtpUser || 'notifications@beforeitsgone.local',
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });
    return;
  }

  throw new Error('No email provider configured.');
}

export class DigestScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastFiredDate: string | null = null;

  start(
    getUserDataDir: () => string,
    fireDigest: () => void
  ): void {
    this.stop();
    this.timer = setInterval(() => {
      const settings = readEmailSettings(getUserDataDir());
      if (settings.provider === 'none' || settings.digest === 'never') return;
      if (settings.paused) {
        if (settings.resumeAt && new Date(settings.resumeAt) <= new Date()) {
          const updated = { ...settings, paused: false, resumeAt: null };
          writeEmailSettings(getUserDataDir(), updated);
        } else {
          return;
        }
      }

      const now = new Date();
      const [hh, mm] = settings.digestTime.split(':').map(Number);
      const isTime = now.getHours() === hh && now.getMinutes() === mm;
      if (!isTime) return;

      const todayStr = now.toISOString().slice(0, 10);
      if (this.lastFiredDate === todayStr) return;

      if (settings.digest === 'weekly') {
        const lastSent = settings.lastSentAt ? new Date(settings.lastSentAt) : null;
        if (lastSent) {
          const daysSince = (now.getTime() - lastSent.getTime()) / (24 * 60 * 60 * 1000);
          if (daysSince < 6.5) return;
        }
      }

      this.lastFiredDate = todayStr;
      fireDigest();
    }, 60_000);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
