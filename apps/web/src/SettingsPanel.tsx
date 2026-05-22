import { type AppSettings, DEFAULT_APP_SETTINGS } from '@before-its-gone/core';

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

        <button type="button" className="btn-ghost" onClick={() => onChange({ ...DEFAULT_APP_SETTINGS })}>
          Reset to defaults
        </button>
      </div>
    </section>
  );
}
