import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScanModal } from './ScanModal.js';
import {
  calculateExpiryDateISO,
  calculateExpiryStatus,
  clearInventory,
  createInventoryItem,
  createLocalStorageAdapter,
  decrementItemQuantity,
  deleteInventoryItem,
  exportInventoryAsCSV,
  exportInventoryAsJSON,
  findBarcodeProfile,
  getFilteredInventory,
  getFrequentItems,
  importInventoryItems,
  parseInventoryJSON,
  saveBarcodeProfile,
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
};

const TODAY_ISO = new Date().toISOString().slice(0, 10);

const INITIAL_FORM: FormState = {
  name: '',
  quantity: 1,
  location: 'fridge',
  barcode: '',
  shelfLifeDays: 7,
  expiryDate: new Date(calculateExpiryDateISO(7)).toISOString().slice(0, 10),
  category: '',
  depletionThreshold: ''
};

const notificationStorage = createLocalStorageAdapter();
const NOTIFICATION_LOG_KEY = 'before-its-gone.notification-log';

async function notifyExpiringItems(items: InventoryItem[]): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  const logged =
    (await notificationStorage.get<Record<string, true>>(NOTIFICATION_LOG_KEY)) ?? {};
  const dayStamp = new Date().toISOString().slice(0, 10);

  for (const item of items) {
    const status = calculateExpiryStatus(item.expiresAt);
    if (status === 'fresh') {
      continue;
    }

    const id = `${item.id}:${status}:${dayStamp}`;
    if (logged[id]) {
      continue;
    }

    const title =
      status === 'expired'
        ? `${item.name} has expired`
        : `${item.name} expires soon`;
    const body = `${item.quantity} unit(s) in ${item.location}. Expires ${new Date(
      item.expiresAt
    ).toLocaleDateString()}.`;
    new Notification(title, { body, tag: id });
    logged[id] = true;
  }

  await notificationStorage.set(NOTIFICATION_LOG_KEY, logged);
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
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [frequentItems, setFrequentItems] = useState<ItemHistory[]>([]);

  const [search, setSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState<FilterLocation>('all');
  const [sortField, setSortField] = useState<SortField>('expiresAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const [scanModal, setScanModal] = useState<{
    qrDataUrl: string;
    serverUrl: string;
    status: 'waiting' | 'received';
  } | null>(null);

  const [notificationState, setNotificationState] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  });

  const loadInventory = useCallback(
    () => getFilteredInventory({ search, location: filterLocation, sortField, sortDirection }),
    [search, filterLocation, sortField, sortDirection]
  );

  useEffect(() => {
    void loadInventory().then(setItems);
  }, [loadInventory]);

  useEffect(() => {
    void notifyExpiringItems(items);
  }, [items]);

  useEffect(() => {
    void getFrequentItems(5).then(setFrequentItems);
  }, []);

  const [allItems, setAllItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    void getFilteredInventory({}).then(setAllItems);
  }, [items]);

  const totalCount = allItems.length;
  const totalUnits = useMemo(
    () => allItems.reduce((sum, item) => sum + item.quantity, 0),
    [allItems]
  );

  const expiredItems = useMemo(
    () => items.filter((item) => calculateExpiryStatus(item.expiresAt) === 'expired').length,
    [items]
  );

  const expiringSoonItems = useMemo(
    () => items.filter((item) => calculateExpiryStatus(item.expiresAt) === 'expiring-soon').length,
    [items]
  );

  const expiringThisWeek = useMemo(() => getExpiringThisWeek(items), [items]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const doBarcodeLookup = async (barcode: string) => {
    const trimmed = barcode.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      const profile = await findBarcodeProfile(trimmed);
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

  const onScanWithPhone = async () => {
    const api = window.beforeItsGone;
    if (!api?.startBarcodeServer) return;
    try {
      const { url, qrDataUrl } = await api.startBarcodeServer();
      setScanModal({ qrDataUrl, serverUrl: url, status: 'waiting' });
      api.onBarcodeScanned?.((barcode) => {
        setField('barcode', barcode);
        setScanModal((m) => m ? { ...m, status: 'received' } : null);
        void doBarcodeLookup(barcode);
        setTimeout(() => {
          setScanModal(null);
          void api.stopBarcodeServer?.();
        }, 1500);
      });
    } catch {
      setStatusMessage('Could not start phone scanner. Check that no other app is using the port.');
    }
  };

  const onCloseScanModal = () => {
    setScanModal(null);
    void window.beforeItsGone?.stopBarcodeServer?.();
  };

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
      depletionThreshold: ''
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
        void notifyExpiringItems(items);
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
      const newItem = await createInventoryItem({
        name,
        quantity: Math.max(1, form.quantity),
        location: form.location,
        barcode: form.barcode.trim() || null,
        expiresAt: new Date(`${form.expiryDate}T23:59:59`).toISOString(),
        category: form.category.trim() || null,
        depletionThreshold: form.depletionThreshold ? Number(form.depletionThreshold) : null
      });

      if (form.barcode.trim()) {
        await saveBarcodeProfile({
          barcode: form.barcode.trim(),
          productName: name,
          defaultShelfLifeDays: Math.max(1, form.shelfLifeDays),
          preferredLocation: form.location
        });
      }

      setItems((prev) => [newItem, ...prev]);
      setForm(INITIAL_FORM);
      setStatusMessage('Item saved.');
      void getFrequentItems(5).then(setFrequentItems);
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (id: string) => {
    await deleteInventoryItem(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const onDecrement = async (id: string) => {
    const { item, depleted } = await decrementItemQuantity(id);
    if (!item) return;

    setItems((prev) => prev.map((i) => (i.id === id ? item : i)));

    if (depleted) {
      void notifyDepletion(item);
    }
  };

  const onExportJSON = async () => {
    const all = await getFilteredInventory({});
    const content = exportInventoryAsJSON(all);
    triggerDownload(content, `before-its-gone-${TODAY_ISO}.json`, 'application/json');
  };

  const onExportCSV = async () => {
    const all = await getFilteredInventory({});
    const content = exportInventoryAsCSV(all);
    triggerDownload(content, `before-its-gone-${TODAY_ISO}.csv`, 'text/csv');
  };

  const onImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const text = await file.text();
      const parsed = parseInventoryJSON(text);
      const count = await importInventoryItems(parsed);
      setItems(await loadInventory());
      setStatusMessage(`Imported ${count} items.`);
    } catch {
      setStatusMessage('Import failed — make sure the file is a valid export.');
    } finally {
      setLoading(false);
      if (importRef.current) {
        importRef.current.value = '';
      }
    }
  };

  const onClearAll = async () => {
    await clearInventory();
    setItems([]);
    setShowClearConfirm(false);
    setStatusMessage('All inventory cleared.');
  };

  return (
    <>
    <main className="app-shell">
      <header>
        <h1>Before It&apos;s Gone</h1>
        <p>Offline inventory tracking that works on web and desktop.</p>
      </header>

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
        <h2>Notifications</h2>
        <p>
          Status:{' '}
          <strong>
            {notificationState === 'unsupported'
              ? 'not supported on this browser'
              : notificationState}
          </strong>
        </p>
        {notificationState !== 'granted' && notificationState !== 'unsupported' ? (
          <button type="button" onClick={onNotificationEnable}>
            Enable expiry notifications
          </button>
        ) : null}
      </section>

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
            <button type="button" onClick={() => void onScanWithPhone()} disabled={loading}>
              Scan with phone
            </button>
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value as FilterLocation)}
          >
            <option value="all">All locations</option>
            <option value="fridge">Fridge</option>
            <option value="freezer">Freezer</option>
            <option value="pantry">Pantry</option>
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
        </div>

        <div className="inventory-grid">
          {items.map((item) => (
            <InventoryCard key={item.id} item={item} onDelete={onDelete} onDecrement={onDecrement} />
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
            Import JSON
            <input
              ref={importRef}
              type="file"
              accept=".json"
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
    </main>

    {scanModal && (
      <ScanModal
        qrDataUrl={scanModal.qrDataUrl}
        serverUrl={scanModal.serverUrl}
        status={scanModal.status}
        onClose={onCloseScanModal}
      />
    )}
    </>
  );
}

export default App;
