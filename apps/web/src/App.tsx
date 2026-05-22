import { type ChangeEvent, type FormEvent, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ScanModal } from './ScanModal.js';
import { AboutDialog } from './AboutDialog.js';
import { SettingsPanel } from './SettingsPanel.js';
import {
  calculateExpiryDateISO,
  calculateExpiryStatus,
  createLocalStorageAdapter,
  importExportService,
  inventoryService,
  type AppSettings,
  DEFAULT_APP_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type FilterLocation,
  type InventoryItem,
  type ItemHistory,
  type SortDirection,
  type SortField,
  type StorageLocation
} from '@before-its-gone/core';
import { InventoryCard } from '@before-its-gone/ui';

type FormState = {
  name: string;
  quantity: number;
  location: StorageLocation;
  barcode: string;
  shelfLifeDays: number;
  expiryDate: string;
  category: string;
  depletionThreshold: string;
  tags: string;
};

const TODAY_ISO = new Date().toISOString().slice(0, 10);

const appStorage = createLocalStorageAdapter();
const NOTIFICATION_LOG_KEY = 'before-its-gone.notification-log';

function getInitialSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      return {
        ...DEFAULT_APP_SETTINGS,
        ...parsed,
        notifications: { ...DEFAULT_APP_SETTINGS.notifications, ...(parsed.notifications ?? {}) }
      };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_APP_SETTINGS };
}

function makeInitialForm(s: AppSettings): FormState {
  return {
    name: '',
    quantity: 1,
    location: s.defaultLocation,
    barcode: '',
    shelfLifeDays: s.defaultShelfLifeDays,
    expiryDate: new Date(calculateExpiryDateISO(s.defaultShelfLifeDays)).toISOString().slice(0, 10),
    category: '',
    depletionThreshold: '',
    tags: ''
  };
}

async function notifyExpiringItems(
  items: InventoryItem[],
  warningWindowDays: number,
  prefs: { expiring: boolean; expired: boolean }
): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  const logged =
    (await appStorage.get<Record<string, true>>(NOTIFICATION_LOG_KEY)) ?? {};
  const dayStamp = new Date().toISOString().slice(0, 10);

  for (const item of items) {
    const status = calculateExpiryStatus(item.expiresAt, warningWindowDays);
    if (status === 'fresh') continue;
    if (status === 'expiring-soon' && !prefs.expiring) continue;
    if (status === 'expired' && !prefs.expired) continue;

    const id = `${item.id}:${status}:${dayStamp}`;
    if (logged[id]) continue;

    const title = status === 'expired' ? `${item.name} has expired` : `${item.name} expires soon`;
    const body = `${item.quantity} unit(s) in ${item.location}. Expires ${new Date(item.expiresAt).toLocaleDateString()}.`;
    new Notification(title, { body, tag: id });
    logged[id] = true;
  }

  await appStorage.set(NOTIFICATION_LOG_KEY, logged);
}

async function notifyDepletion(item: InventoryItem): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  const title = `${item.name} is running low`;
  const body = `Only ${item.quantity} unit(s) left in ${item.location}.`;
  new Notification(title, { body, tag: `depletion:${item.id}:${item.quantity}` });
}

async function lookupBarcodeOnline(barcode: string): Promise<string | null> {
  const normalized = barcode.trim();
  if (!normalized) {
    return null;
  }

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(normalized)}.json`
    );
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      product?: { product_name?: string };
    };
    const name = payload.product?.product_name?.trim();
    return name || null;
  } catch {
    return null;
  }
}

function triggerDownload(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getExpiringThisWeek(items: InventoryItem[]): number {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  return items.filter((item) => {
    const t = new Date(item.expiresAt).getTime();
    return t >= now && t <= now + weekMs;
  }).length;
}

function App() {
  const [settings, setSettings] = useState<AppSettings>(getInitialSettings);
  const [activeTab, setActiveTab] = useState<'inventory' | 'settings'>('inventory');

  const onChangeSettings = useCallback((next: AppSettings) => {
    setSettings(next);
    void appStorage.set(SETTINGS_STORAGE_KEY, next);
  }, []);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [form, setForm] = useState<FormState>(() => makeInitialForm(getInitialSettings()));
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [frequentItems, setFrequentItems] = useState<ItemHistory[]>([]);

  const [searchInput, setSearchInput] = useState('');
  const search = useDeferredValue(searchInput);
  const [filterLocation, setFilterLocation] = useState<FilterLocation>('all');
  const [sortField, setSortField] = useState<SortField>('expiresAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const [scanModal, setScanModal] = useState<{
    qrDataUrl: string;
    serverUrl: string;
    status: 'waiting' | 'received';
  } | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [platform, setPlatform] = useState<string | undefined>(undefined);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [statsVersion, setStatsVersion] = useState(0);
  const bumpStats = () => setStatsVersion((v) => v + 1);

  const [undoPending, setUndoPending] = useState<{
    id: string;
    prevQty: number;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  const [notificationState, setNotificationState] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  });

  const [aboutOpen, setAboutOpen] = useState(false);
  const [appVersion, setAppVersion] = useState(() => import.meta.env.VITE_APP_VERSION ?? '');
  const [updateBanner, setUpdateBanner] = useState<{
    version: string;
    state: 'downloading' | 'ready' | 'linux-link';
  } | null>(null);

  const loadInventory = useCallback(
    () => inventoryService.list({ search, location: filterLocation, sortField, sortDirection, tags: activeTags }),
    [search, filterLocation, sortField, sortDirection, activeTags]
  );

  useEffect(() => {
    void loadInventory().then(setItems);
  }, [loadInventory]);

  useEffect(() => {
    void notifyExpiringItems(items, settings.expiryWarningDays, settings.notifications);
  }, [items, settings.expiryWarningDays, settings.notifications]);

  useEffect(() => {
    void inventoryService.frequentItems(5).then(setFrequentItems);
  }, []);

  useEffect(() => {
    void window.beforeItsGone?.getPlatform?.().then(setPlatform);
  }, []);

  useEffect(() => {
    void window.beforeItsGone?.getAppVersion?.().then((v) => { if (v) setAppVersion(v); });
  }, []);

  useEffect(() => {
    window.beforeItsGone?.onUpdateAvailable?.((info) => {
      setUpdateBanner({ version: info.version, state: info.isLinuxPackage ? 'linux-link' : 'downloading' });
    });
    window.beforeItsGone?.onUpdateDownloaded?.((info) => {
      setUpdateBanner({ version: info.version, state: 'ready' });
    });
  }, []);

  useEffect(() => {
    window.beforeItsGone?.onSaveItemFromPhone?.(async (data) => {
      await inventoryService.create({
        name: data.name,
        quantity: data.quantity,
        location: data.location,
        barcode: data.barcode || null,
        expiresAt: calculateExpiryDateISO(data.shelfLifeDays),
        category: data.category
      });
      if (data.barcode) {
        await inventoryService.saveProfile({
          barcode: data.barcode,
          productName: data.name,
          defaultShelfLifeDays: data.shelfLifeDays,
          preferredLocation: data.location
        });
      }
      const refreshed = await loadInventory();
      setItems(refreshed);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [allItems, setAllItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    void inventoryService.list({}).then(setAllItems);
  }, [statsVersion]);

  const totalCount = allItems.length;
  const totalUnits = useMemo(
    () => allItems.reduce((sum, item) => sum + item.quantity, 0),
    [allItems]
  );

  const expiredItems = useMemo(
    () => items.filter((item) => calculateExpiryStatus(item.expiresAt, settings.expiryWarningDays) === 'expired').length,
    [items, settings.expiryWarningDays]
  );

  const expiringSoonItems = useMemo(
    () => items.filter((item) => calculateExpiryStatus(item.expiresAt, settings.expiryWarningDays) === 'expiring-soon').length,
    [items, settings.expiryWarningDays]
  );

  const expiringThisWeek = useMemo(() => getExpiringThisWeek(items), [items]);

  const availableTags = useMemo(
    () => [...new Set(allItems.flatMap((item) => item.tags))].sort(),
    [allItems]
  );

  const onToggleTag = (tag: string) => {
    setActiveTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const doBarcodeLookup = async (barcode: string) => {
    const trimmed = barcode.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      const profile = await inventoryService.findProfile(trimmed);
      if (profile) {
        setForm((prev) => ({
          ...prev,
          barcode: trimmed,
          name: prev.name.trim() ? prev.name : profile.productName,
          location: profile.preferredLocation,
          shelfLifeDays: profile.defaultShelfLifeDays,
          expiryDate: new Date(calculateExpiryDateISO(profile.defaultShelfLifeDays))
            .toISOString()
            .slice(0, 10)
        }));
        setStatusMessage('Loaded saved barcode profile.');
      } else {
        setStatusMessage('No saved profile for that barcode yet.');
      }
    } finally {
      setLoading(false);
    }
  };

  const onBarcodeBlur = () => { void doBarcodeLookup(form.barcode); };

  const onStopScanner = () => {
    setScanModal(null);
    setScannerActive(false);
    void window.beforeItsGone?.stopBarcodeServer?.();
  };

  const onScanWithPhone = async () => {
    const api = window.beforeItsGone;
    if (!api?.startBarcodeServer) return;
    try {
      const { url, qrDataUrl } = await api.startBarcodeServer();
      setScannerActive(true);
      setScanModal({ qrDataUrl, serverUrl: url, status: 'waiting' });
      api.onBarcodeScanned?.((barcode) => {
        setField('barcode', barcode);
        setScanModal((m) => m ? { ...m, status: 'received' } : null);
        void doBarcodeLookup(barcode);
        setTimeout(() => {
          setScanModal(null);
        }, 1500);
      });
    } catch {
      setScannerActive(false);
      setStatusMessage('Could not start phone scanner. Check that no other app is using the port.');
    }
  };

  const onCloseScanModal = () => { setScanModal(null); };

  const onBarcodeLookup = async () => {
    const barcode = form.barcode.trim();
    if (!barcode) return;

    setLoading(true);
    try {
      const remoteName = await lookupBarcodeOnline(barcode);
      if (!remoteName) {
        setStatusMessage('No product name found from online lookup.');
        return;
      }
      setField('name', remoteName);
      setStatusMessage('Loaded product name from barcode database.');
    } finally {
      setLoading(false);
    }
  };

  const onQuickAdd = (entry: ItemHistory) => {
    setForm({
      name: entry.name,
      quantity: 1,
      location: entry.location,
      barcode: entry.barcode ?? '',
      shelfLifeDays: entry.shelfLifeDays,
      expiryDate: new Date(calculateExpiryDateISO(entry.shelfLifeDays)).toISOString().slice(0, 10),
      category: entry.category ?? '',
      depletionThreshold: '',
      tags: ''
    });
    setStatusMessage(`Pre-filled form from "${entry.name}" history.`);
  };

  const onNotificationEnable = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationState('unsupported');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationState(permission);
      if (permission === 'granted') {
        setStatusMessage('Notifications enabled for expiring items.');
        void notifyExpiringItems(items, settings.expiryWarningDays, settings.notifications);
      }
    } catch {
      setNotificationState('denied');
      setStatusMessage('Could not request notification permission.');
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) return;

    setLoading(true);
    try {
      const newItem = await inventoryService.create({
        name,
        quantity: Math.max(1, form.quantity),
        location: form.location,
        barcode: form.barcode.trim() || null,
        expiresAt: new Date(`${form.expiryDate}T23:59:59`).toISOString(),
        shelfLifeDays: Math.max(1, form.shelfLifeDays),
        category: form.category.trim() || null,
        depletionThreshold: form.depletionThreshold ? Number(form.depletionThreshold) : null,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean)
      });

      if (form.barcode.trim()) {
        await inventoryService.saveProfile({
          barcode: form.barcode.trim(),
          productName: name,
          defaultShelfLifeDays: Math.max(1, form.shelfLifeDays),
          preferredLocation: form.location
        });
      }

      setItems((prev) => [newItem, ...prev]);
      setForm(makeInitialForm(settings));
      setStatusMessage('Item saved.');
      bumpStats();
      void inventoryService.frequentItems(5).then(setFrequentItems);
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (id: string) => {
    await inventoryService.remove(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
    bumpStats();
  };

  const onDecrement = async (id: string) => {
    const existing = items.find((i) => i.id === id);
    if (!existing) return;

    const { item, depleted } = await inventoryService.decrement(id);
    if (!item) return;

    setItems((prev) => prev.map((i) => (i.id === id ? item : i)));
    bumpStats();

    if (depleted && settings.notifications.lowStock) void notifyDepletion(item);

    setUndoPending((prev) => {
      if (prev) clearTimeout(prev.timer);
      const timer = setTimeout(() => setUndoPending(null), 5000);
      return { id, prevQty: existing.quantity, timer };
    });
  };

  const onUndoDecrement = async () => {
    if (!undoPending) return;
    clearTimeout(undoPending.timer);
    const { id, prevQty } = undoPending;
    setUndoPending(null);
    const restored = await inventoryService.update(id, { quantity: prevQty });
    if (restored) {
      setItems((prev) => prev.map((i) => (i.id === id ? restored : i)));
      bumpStats();
    }
  };

  const onIncrement = async (id: string) => {
    const item = await inventoryService.increment(id);
    if (!item) return;
    setItems((prev) => prev.map((i) => (i.id === id ? item : i)));
    bumpStats();
  };

  const onEdit = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setEditingItemId(id);
    setEditForm({
      name: item.name,
      quantity: item.quantity,
      location: item.location,
      barcode: item.barcode ?? '',
      shelfLifeDays: item.shelfLifeDays ?? Math.max(1, Math.round(
        (new Date(item.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      )),
      expiryDate: new Date(item.expiresAt).toISOString().slice(0, 10),
      category: item.category ?? '',
      depletionThreshold: item.depletionThreshold != null ? String(item.depletionThreshold) : '',
      tags: item.tags?.join(', ') ?? ''
    });
  };

  const onEditSave = async () => {
    if (!editingItemId || !editForm) return;
    const name = editForm.name.trim();
    if (!name) return;
    setLoading(true);
    try {
      const updated = await inventoryService.update(editingItemId, {
        name,
        quantity: Math.max(1, editForm.quantity),
        location: editForm.location,
        barcode: editForm.barcode.trim() || null,
        expiresAt: new Date(`${editForm.expiryDate}T23:59:59`).toISOString(),
        shelfLifeDays: Math.max(1, editForm.shelfLifeDays),
        category: editForm.category.trim() || null,
        depletionThreshold: editForm.depletionThreshold ? Number(editForm.depletionThreshold) : null,
        tags: editForm.tags.split(',').map((t) => t.trim()).filter(Boolean)
      });
      if (updated) {
        setItems((prev) => prev.map((i) => (i.id === editingItemId ? updated : i)));
        bumpStats();
      }
      setEditingItemId(null);
      setEditForm(null);
    } finally {
      setLoading(false);
    }
  };

  const onEditCancel = () => {
    setEditingItemId(null);
    setEditForm(null);
  };

  const onToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const onDeleteSelected = async () => {
    for (const id of selectedIds) {
      await inventoryService.remove(id);
    }
    setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
    setSelectedIds(new Set());
    setBulkMode(false);
    bumpStats();
  };

  const onMoveSelected = async (location: StorageLocation) => {
    const next: InventoryItem[] = [];
    for (const item of items) {
      if (selectedIds.has(item.id)) {
        const updated = await inventoryService.update(item.id, { location });
        next.push(updated ?? item);
      } else {
        next.push(item);
      }
    }
    setItems(next);
    setSelectedIds(new Set());
    setBulkMode(false);
    bumpStats();
  };

  const onExportJSON = async () => {
    const all = await inventoryService.list({});
    const content = importExportService.toJSON(all);
    triggerDownload(content, `before-its-gone-${TODAY_ISO}.json`, 'application/json');
  };

  const onExportCSV = async () => {
    const all = await inventoryService.list({});
    const content = importExportService.toCSV(all);
    triggerDownload(content, `before-its-gone-${TODAY_ISO}.csv`, 'text/csv');
  };

  const onImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const text = await file.text();
      let count = 0;
      let extra = '';

      if (file.name.endsWith('.csv')) {
        const { imported, skipped } = await inventoryService.importCSV(text);
        count = imported;
        if (skipped > 0) extra = ` (${skipped} row${skipped > 1 ? 's' : ''} skipped — missing name/expires_at or invalid location)`;
      } else {
        const parsed = importExportService.parseJSON(text);
        count = await inventoryService.importJSON(parsed);
      }

      setItems(await loadInventory());
      bumpStats();
      setStatusMessage(`Imported ${count} items.${extra}`);
    } catch {
      setStatusMessage('Import failed — check the file format (JSON or CSV).');
    } finally {
      setLoading(false);
      if (importRef.current) importRef.current.value = '';
    }
  };

  const onClearAll = async () => {
    await inventoryService.clear();
    setItems([]);
    setShowClearConfirm(false);
    setStatusMessage('All inventory cleared.');
    bumpStats();
  };

  return (
    <>
    {updateBanner && (
      <div className="update-banner" data-state={updateBanner.state}>
        <span>
          {updateBanner.state === 'downloading' && `Downloading update v${updateBanner.version}…`}
          {updateBanner.state === 'ready' && (
            <>Update v{updateBanner.version} ready &mdash; <button onClick={() => { void window.beforeItsGone?.installUpdate?.(); }}>Restart to install</button></>
          )}
          {updateBanner.state === 'linux-link' && (
            <>Update v{updateBanner.version} available &mdash; <a href="https://github.com/AetherAssembly/Before-Its-Gone/releases/latest" target="_blank" rel="noopener noreferrer">Download</a></>
          )}
        </span>
        <button className="update-banner-dismiss" onClick={() => setUpdateBanner(null)} aria-label="Dismiss">&times;</button>
      </div>
    )}
    <main className="app-shell">
      <header className="app-header">
        <div className="app-brand">
          <img src={`${import.meta.env.BASE_URL}icons/icon-192.svg`} className="brand-logo" width="40" height="40" alt="" aria-hidden="true" />
          <div className="brand-text">
            <h1>Before It&apos;s Gone</h1>
            <p>Offline inventory tracking that works on web and desktop.</p>
          </div>
        </div>
        <button className="about-trigger" onClick={() => setAboutOpen(true)} title="About" aria-label="About">&#9432;</button>
      </header>
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} version={appVersion} />

      <nav className="tab-nav">
        <button
          type="button"
          className="tab-btn"
          data-active={activeTab === 'inventory' ? 'true' : undefined}
          onClick={() => setActiveTab('inventory')}
        >
          Inventory
        </button>
        <button
          type="button"
          className="tab-btn"
          data-active={activeTab === 'settings' ? 'true' : undefined}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </nav>

      {activeTab === 'settings' && (
        <SettingsPanel
          settings={settings}
          onChange={onChangeSettings}
          notificationState={notificationState}
          onEnableNotifications={() => { void onNotificationEnable(); }}
        />
      )}

      {activeTab === 'inventory' && <>
      <section className="summary">
        <div className="summary-grid">
          <div className="stat-card">
            <span className="stat-value">{totalCount}</span>
            <span className="stat-label">products</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{totalUnits}</span>
            <span className="stat-label">units</span>
          </div>
          <div className="stat-card stat-card--warning">
            <span className="stat-value">{expiringThisWeek}</span>
            <span className="stat-label">expiring this week</span>
          </div>
          <div className="stat-card stat-card--warning">
            <span className="stat-value">{expiringSoonItems}</span>
            <span className="stat-label">expiring soon</span>
          </div>
          <div className="stat-card stat-card--danger">
            <span className="stat-value">{expiredItems}</span>
            <span className="stat-label">expired</span>
          </div>
        </div>
      </section>

      {frequentItems.length > 0 && (
        <section className="panel">
          <h2>Quick add</h2>
          <div className="quick-add-row">
            {frequentItems.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="quick-add-btn"
                onClick={() => onQuickAdd(entry)}
                title={`Used ${entry.useCount}×`}
              >
                {entry.name}
                {entry.category ? <span className="tag">{entry.category}</span> : null}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <h2>Add item</h2>
        <form onSubmit={onSubmit} className="inventory-form">
          <label>
            Barcode (optional)
            <input
              value={form.barcode}
              placeholder="e.g. 0123456789012"
              onChange={(e) => setField('barcode', e.target.value)}
              onBlur={() => { void onBarcodeBlur(); }}
            />
          </label>

          <button type="button" onClick={() => void onBarcodeLookup()} disabled={loading}>
            {loading ? 'Looking up…' : 'Lookup barcode online'}
          </button>

          {window.beforeItsGone?.startBarcodeServer && (
            scannerActive ? (
              <button type="button" className="btn-ghost" onClick={onStopScanner}>
                Scanner active — click to stop
              </button>
            ) : (
              <button type="button" onClick={() => void onScanWithPhone()} disabled={loading}>
                Scan with phone
              </button>
            )
          )}

          <label>
            Name
            <input
              required
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
            />
          </label>

          <label>
            Category (optional)
            <input
              value={form.category}
              placeholder="e.g. dairy, meat, snacks"
              onChange={(e) => setField('category', e.target.value)}
            />
          </label>

          <label>
            Tags (optional, comma-separated)
            <input
              value={form.tags}
              placeholder="e.g. organic, local, bulk"
              onChange={(e) => setField('tags', e.target.value)}
            />
          </label>

          <label>
            Shelf life (days)
            <input
              type="number"
              min={1}
              value={form.shelfLifeDays}
              onChange={(e) => {
                const days = Math.max(1, Number(e.target.value) || 1);
                setForm((prev) => ({
                  ...prev,
                  shelfLifeDays: days,
                  expiryDate: new Date(calculateExpiryDateISO(days)).toISOString().slice(0, 10)
                }));
              }}
            />
          </label>

          <label>
            Expiry date
            <input
              type="date"
              min={TODAY_ISO}
              required
              value={form.expiryDate}
              onChange={(e) => setField('expiryDate', e.target.value)}
            />
          </label>

          <label>
            Quantity
            <input
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => setField('quantity', Number(e.target.value) || 1)}
            />
          </label>

          <label>
            Low stock alert at (optional)
            <input
              type="number"
              min={1}
              value={form.depletionThreshold}
              placeholder="e.g. 2 — notify when ≤ this many left"
              onChange={(e) => setField('depletionThreshold', e.target.value)}
            />
          </label>

          <label>
            Location
            <select
              value={form.location}
              onChange={(e) => setField('location', e.target.value as StorageLocation)}
            >
              <option value="fridge">Fridge</option>
              <option value="freezer">Freezer</option>
              <option value="pantry">Pantry</option>
              {settings.customLocations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </label>

          <button type="submit" disabled={loading}>
            {loading ? 'Saving…' : 'Save item'}
          </button>
        </form>
        {statusMessage ? <p className="status-msg">{statusMessage}</p> : null}
      </section>

      <section className="panel">
        <h2>Inventory</h2>

        <div className="controls-row">
          <input
            className="search-input"
            placeholder="Search name, barcode, category…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />

          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value as FilterLocation)}
          >
            <option value="all">All locations</option>
            <option value="fridge">Fridge</option>
            <option value="freezer">Freezer</option>
            <option value="pantry">Pantry</option>
            {settings.customLocations.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>

          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
          >
            <option value="expiresAt">Sort: expiry date</option>
            <option value="createdAt">Sort: date added</option>
            <option value="name">Sort: name</option>
          </select>

          <button
            type="button"
            className="btn-ghost"
            onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
            title="Toggle sort direction"
          >
            {sortDirection === 'asc' ? '↑ Asc' : '↓ Desc'}
          </button>

          <button
            type="button"
            className="btn-ghost"
            onClick={() => { setBulkMode((m) => !m); setSelectedIds(new Set()); }}
          >
            {bulkMode ? 'Cancel bulk' : 'Bulk select'}
          </button>
        </div>

        {bulkMode && selectedIds.size > 0 && (
          <div className="bulk-toolbar">
            <span>{selectedIds.size} selected</span>
            <button type="button" className="btn-danger" onClick={() => void onDeleteSelected()}>
              Delete selected
            </button>
            <span>Move to:</span>
            <button type="button" className="btn-sm" onClick={() => void onMoveSelected('fridge')}>Fridge</button>
            <button type="button" className="btn-sm" onClick={() => void onMoveSelected('freezer')}>Freezer</button>
            <button type="button" className="btn-sm" onClick={() => void onMoveSelected('pantry')}>Pantry</button>
          </div>
        )}

        {editingItemId && editForm && (
          <div className="panel edit-panel">
            <h3>Edit item</h3>
            <div className="inventory-form">
              <label>Name
                <input value={editForm.name} required onChange={(e) => setEditForm((f) => f ? { ...f, name: e.target.value } : f)} />
              </label>
              <label>Category (optional)
                <input value={editForm.category} placeholder="e.g. dairy" onChange={(e) => setEditForm((f) => f ? { ...f, category: e.target.value } : f)} />
              </label>
              <label>Tags (comma-separated)
                <input value={editForm.tags} placeholder="e.g. organic, local" onChange={(e) => setEditForm((f) => f ? { ...f, tags: e.target.value } : f)} />
              </label>
              <label>Quantity
                <input type="number" min={1} value={editForm.quantity} onChange={(e) => setEditForm((f) => f ? { ...f, quantity: Number(e.target.value) || 1 } : f)} />
              </label>
              <label>Expiry date
                <input type="date" value={editForm.expiryDate} onChange={(e) => setEditForm((f) => f ? { ...f, expiryDate: e.target.value } : f)} />
              </label>
              <label>Location
                <select value={editForm.location} onChange={(e) => setEditForm((f) => f ? { ...f, location: e.target.value as StorageLocation } : f)}>
                  <option value="fridge">Fridge</option>
                  <option value="freezer">Freezer</option>
                  <option value="pantry">Pantry</option>
                  {settings.customLocations.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </label>
              <label>Low stock alert at (optional)
                <input type="number" min={1} value={editForm.depletionThreshold} placeholder="e.g. 2" onChange={(e) => setEditForm((f) => f ? { ...f, depletionThreshold: e.target.value } : f)} />
              </label>
              <div className="confirm-row">
                <button type="button" disabled={loading} onClick={() => void onEditSave()}>{loading ? 'Saving…' : 'Save changes'}</button>
                <button type="button" className="btn-ghost" onClick={onEditCancel}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {availableTags.length > 0 && (
          <div className="tag-filters">
            {availableTags.map((tag) => (
              <span
                key={tag}
                className={`tag tag--filter${activeTags.includes(tag) ? ' tag--active' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => onToggleTag(tag)}
                onKeyDown={(e) => e.key === 'Enter' && onToggleTag(tag)}
              >
                {tag}
              </span>
            ))}
            {activeTags.length > 0 && (
              <button type="button" className="btn-ghost btn-sm" onClick={() => setActiveTags([])}>
                Clear
              </button>
            )}
          </div>
        )}

        <div className="inventory-grid">
          {items.map((item) => (
            <InventoryCard
              key={item.id}
              item={item}
              onDelete={onDelete}
              onDecrement={onDecrement}
              onIncrement={onIncrement}
              onEdit={onEdit}
              selected={bulkMode ? selectedIds.has(item.id) : undefined}
              onToggleSelect={bulkMode ? onToggleSelect : undefined}
              warningWindowDays={settings.expiryWarningDays}
              onTagClick={onToggleTag}
            />
          ))}
          {items.length === 0 ? <p>No items match your filters.</p> : null}
        </div>
      </section>

      <section className="panel">
        <h2>Data</h2>
        <div className="data-actions">
          <button type="button" onClick={() => void onExportJSON()}>
            Export JSON
          </button>
          <button type="button" onClick={() => void onExportCSV()}>
            Export CSV
          </button>
          <label className="file-label">
            Import JSON / CSV
            <input
              ref={importRef}
              type="file"
              accept=".json,.csv"
              className="sr-only"
              onChange={(e) => { void onImport(e); }}
            />
          </label>

          {!showClearConfirm ? (
            <button
              type="button"
              className="btn-danger"
              onClick={() => setShowClearConfirm(true)}
            >
              Clear all data
            </button>
          ) : (
            <div className="confirm-row">
              <span>Are you sure? This cannot be undone.</span>
              <button type="button" className="btn-danger" onClick={() => void onClearAll()}>
                Yes, clear all
              </button>
              <button type="button" className="btn-ghost" onClick={() => setShowClearConfirm(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </section>
      </>}
    </main>

    {undoPending && (
      <div className="undo-toast" role="status" aria-live="polite">
        <span>Used one.</span>
        <button type="button" onClick={() => { void onUndoDecrement(); }}>Undo</button>
      </div>
    )}

    {scanModal && (
      <ScanModal
        qrDataUrl={scanModal.qrDataUrl}
        serverUrl={scanModal.serverUrl}
        status={scanModal.status}
        platform={platform}
        onClose={onCloseScanModal}
      />
    )}
    </>
  );
}

export default App;
