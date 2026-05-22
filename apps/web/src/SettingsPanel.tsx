import { useEffect, useState } from 'react';
import { type AppSettings, DEFAULT_APP_SETTINGS } from '@before-its-gone/core';

const BUILT_IN_LOCATIONS = ['fridge', 'freezer', 'pantry'];

const DEFAULT_EMAIL: EmailSettings = {
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

function snoozeUntil(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function EmailSettingsForm() {
  const api = window.beforeItsGone;
  const [settings, setSettings] = useState<EmailSettings>(DEFAULT_EMAIL);
  const [status, setStatus] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!api?.getEmailSettings) return;
    void api.getEmailSettings().then((s) => setSettings({ ...DEFAULT_EMAIL, ...s }));
  }, [api]);

  if (!api?.getEmailSettings) {
    return <p className="settings-hint">Email notifications are only available in the desktop app.</p>;
  }

  const set = <K extends keyof EmailSettings>(key: K, value: EmailSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const save = async (patch?: Partial<EmailSettings>) => {
    setSaving(true);
    try {
      const next = patch ? { ...settings, ...patch } : settings;
      setSettings(next);
      await api.saveEmailSettings!(next);
      setStatus('Settings saved.');
    } catch {
      setStatus('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const testEmail = async () => {
    setTesting(true);
    setStatus('');
    try {
      await save();
      await api.sendEmail!({ subject: "Before It's Gone — test email", html: '<p>Your email notifications are working correctly.</p>' });
      setStatus('Test email sent! Check your inbox.');
    } catch (e) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <fieldset className="settings-fieldset">
      <legend>Email notifications</legend>
      {settings.paused && (
        <div className="email-pause-notice">
          <span>Emails are paused{settings.resumeAt ? ` until ${new Date(settings.resumeAt).toLocaleDateString()}` : ' indefinitely'}.</span>
          <button type="button" className="btn-sm" onClick={() => { void save({ paused: false, resumeAt: null }); }}>
            Resume
          </button>
        </div>
      )}

      <label>
        Provider
        <select value={settings.provider} onChange={(e) => set('provider', e.target.value as EmailSettings['provider'])}>
          <option value="none">Disabled</option>
          <option value="resend">Resend</option>
          <option value="smtp">SMTP</option>
        </select>
      </label>

      {settings.provider !== 'none' && <>
        <label>
          Recipient email
          <input type="email" value={settings.to} placeholder="you@example.com" onChange={(e) => set('to', e.target.value)} />
        </label>

        {settings.provider === 'resend' && (
          <label>
            Resend API key
            <input type="password" value={settings.resendApiKey} placeholder="re_…" onChange={(e) => set('resendApiKey', e.target.value)} />
          </label>
        )}

        {settings.provider === 'smtp' && <>
          <label>
            SMTP host
            <input value={settings.smtpHost} placeholder="smtp.example.com" onChange={(e) => set('smtpHost', e.target.value)} />
          </label>
          <label>
            SMTP port
            <input type="number" min={1} max={65535} value={settings.smtpPort} onChange={(e) => set('smtpPort', Number(e.target.value) || 587)} />
          </label>
          <label>
            Username (optional)
            <input value={settings.smtpUser} placeholder="user@example.com" onChange={(e) => set('smtpUser', e.target.value)} />
          </label>
          <label>
            Password (optional)
            <input type="password" value={settings.smtpPass} onChange={(e) => set('smtpPass', e.target.value)} />
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={settings.smtpTls} onChange={(e) => set('smtpTls', e.target.checked)} />
            Use TLS
          </label>
        </>}

        <label>
          Digest frequency
          <select value={settings.digest} onChange={(e) => set('digest', e.target.value as EmailSettings['digest'])}>
            <option value="never">Never</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>

        {settings.digest !== 'never' && (
          <label>
            Send time (24-hour)
            <input type="time" value={settings.digestTime} onChange={(e) => set('digestTime', e.target.value)} />
          </label>
        )}

        {settings.lastSentAt && (
          <p className="settings-hint">Last sent: {new Date(settings.lastSentAt).toLocaleString()}</p>
        )}

        <div className="email-actions">
          <button type="button" disabled={saving} onClick={() => { void save(); }}>
            {saving ? 'Saving…' : 'Save email settings'}
          </button>
          <button type="button" className="btn-ghost" disabled={testing || saving} onClick={() => { void testEmail(); }}>
            {testing ? 'Sending…' : 'Send test email'}
          </button>
        </div>

        {!settings.paused && (
          <div className="snooze-row">
            <span className="settings-hint">Pause emails:</span>
            <button type="button" className="btn-sm btn-ghost" onClick={() => { void save({ paused: true, resumeAt: snoozeUntil(7) }); }}>7 days</button>
            <button type="button" className="btn-sm btn-ghost" onClick={() => { void save({ paused: true, resumeAt: snoozeUntil(30) }); }}>30 days</button>
            <button type="button" className="btn-sm btn-ghost" onClick={() => { void save({ paused: true, resumeAt: null }); }}>Indefinitely</button>
          </div>
        )}

        {status && <p className="settings-hint">{status}</p>}
      </>}
    </fieldset>
  );
}

function AddLocationForm({ onAdd }: { onAdd: (name: string) => void }) {
  const [value, setValue] = useState('');

  const commit = () => {
    const name = value.trim();
    if (name) { onAdd(name); setValue(''); }
  };

  return (
    <div className="add-location-form">
      <input
        placeholder="New location name…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
      />
      <button type="button" disabled={!value.trim()} onClick={commit}>Add</button>
    </div>
  );
}

type SettingsPanelProps = {
  settings: AppSettings;
  onChange: (next: AppSettings) => void;
  notificationState: NotificationPermission | 'unsupported';
  onEnableNotifications: () => void;
};

export function SettingsPanel({ settings, onChange, notificationState, onEnableNotifications }: SettingsPanelProps) {
  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    onChange({ ...settings, [key]: value });

  const setNotif = (key: keyof AppSettings['notifications'], value: boolean) =>
    onChange({ ...settings, notifications: { ...settings.notifications, [key]: value } });

  return (
    <section className="panel">
      <h2>Settings</h2>
      <div className="settings-form">
        <label>
          Default storage location
          <select
            value={settings.defaultLocation}
            onChange={(e) => set('defaultLocation', e.target.value as AppSettings['defaultLocation'])}
          >
            <option value="fridge">Fridge</option>
            <option value="freezer">Freezer</option>
            <option value="pantry">Pantry</option>
          </select>
        </label>

        <label>
          Default shelf life (days)
          <input
            type="number"
            min={1}
            value={settings.defaultShelfLifeDays}
            onChange={(e) => set('defaultShelfLifeDays', Math.max(1, Number(e.target.value) || 1))}
          />
        </label>

        <label>
          Expiry warning window (days)
          <input
            type="number"
            min={1}
            value={settings.expiryWarningDays}
            onChange={(e) => set('expiryWarningDays', Math.max(1, Number(e.target.value) || 1))}
          />
          <span className="settings-hint">Items expiring within this many days show as &ldquo;expiring soon&rdquo;.</span>
        </label>

        <fieldset className="settings-fieldset">
          <legend>Browser notifications</legend>
          <p className="settings-status">
            Status: <strong>{notificationState === 'unsupported' ? 'not supported' : notificationState}</strong>
          </p>
          {notificationState !== 'granted' && notificationState !== 'unsupported' && (
            <button type="button" onClick={onEnableNotifications}>
              Enable expiry notifications
            </button>
          )}
          {notificationState === 'granted' && (
            <div className="settings-toggles">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={settings.notifications.expiring}
                  onChange={(e) => setNotif('expiring', e.target.checked)}
                />
                Notify when items are expiring soon
              </label>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={settings.notifications.expired}
                  onChange={(e) => setNotif('expired', e.target.checked)}
                />
                Notify when items have expired
              </label>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={settings.notifications.lowStock}
                  onChange={(e) => setNotif('lowStock', e.target.checked)}
                />
                Notify when items are running low
              </label>
            </div>
          )}
        </fieldset>

        <fieldset className="settings-fieldset">
          <legend>Custom storage locations</legend>
          {settings.customLocations.length === 0 ? (
            <p className="settings-hint">No custom locations yet.</p>
          ) : (
            <div className="custom-locations-list">
              {settings.customLocations.map((loc) => (
                <div key={loc} className="custom-location-row">
                  <span>{loc}</span>
                  <button
                    type="button"
                    className="btn-sm btn-ghost"
                    onClick={() => onChange({
                      ...settings,
                      customLocations: settings.customLocations.filter((l) => l !== loc),
                      defaultLocation: settings.defaultLocation === loc ? 'fridge' : settings.defaultLocation
                    })}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          <AddLocationForm
            onAdd={(name) => {
              if (!BUILT_IN_LOCATIONS.includes(name.toLowerCase()) && !settings.customLocations.includes(name)) {
                onChange({ ...settings, customLocations: [...settings.customLocations, name] });
              }
            }}
          />
        </fieldset>

        <EmailSettingsForm />

        <button type="button" className="btn-ghost" onClick={() => onChange({ ...DEFAULT_APP_SETTINGS })}>
          Reset to defaults
        </button>
      </div>
    </section>
  );
}
