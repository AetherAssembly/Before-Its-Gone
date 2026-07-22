import { type ChangeEvent, type FormEvent, lazy, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ScanModal } from './ScanModal.js';
import { BarcodeScannerModal } from './BarcodeScannerModal.js';
import { AboutDialog } from './AboutDialog.js';
const SettingsPanel = lazy(() => import('./SettingsPanel.js').then(m => ({ default: m.SettingsPanel })));
import {
  calculateExpiryDateISO,
  calculateExpiryStatus,
  createLocalStorageAdapter,
  getShoppingList,
  getWasteLog,
  listInventoryItems,
  upsertInventoryItem,
  logWastedItem,
  clearWasteLog,
  renderDigest,
  importExportService,
  type AppSettings,
  DEFAULT_APP_SETTINGS,
  SETTINGS_STORAGE_KEY,
  SYNC_SETTINGS_STORAGE_KEY,
  type FilterLocation,
  type InventoryItem,
  type ItemHistory,
  type SortDirection,
  type SortField,
  type StorageLocation,
  type WasteLogEntry
} from '@aetherAssembly/big-core';
import { getWorkerInventoryService } from './inventoryWorkerService.js';
import { useTranslation } from 'react-i18next';

const inventoryService = getWorkerInventoryService();
import { InventoryCard } from '@aetherAssembly/big-ui';
import { useToast } from './Toast.js';
import { ItemDrawer, type FormState, resizeImage } from './ItemDrawer.js';
const StatsCharts = lazy(() => import('./StatsCharts.js').then(m => ({ default: m.StatsCharts })));
import { ExpiryTimeline } from './ExpiryTimeline.js';
import { ErrorBoundary } from './ErrorBoundary.js';
import { useFocusTrap } from './useFocusTrap.js';
import { useVirtualizer } from './useVirtualizer.js';


const TODAY_ISO = new Date().toISOString().slice(0, 10);

const appStorage = createLocalStorageAdapter();
const NOTIFICATION_LOG_KEY = 'before-its-gone.notification-log';
const THEME_KEY = 'before-its-gone.theme';

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
    tags: '',
    recurring: false,
    restockQuantity: '',
    photo: '',
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
  const { t } = useTranslation();
  const [settings, setSettings] = useState<AppSettings>(getInitialSettings);
  const [activeTab, setActiveTab] = useState<'inventory' | 'shopping' | 'waste' | 'recipes' | 'settings'>('inventory');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem(THEME_KEY) as 'dark' | 'light') ?? 'dark');
  const [wasteLog, setWasteLog] = useState<WasteLogEntry[]>([]);

  const onChangeSettings = useCallback((next: AppSettings) => {
    setSettings(next);
    void appStorage.set(SETTINGS_STORAGE_KEY, next);
  }, []);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [form, setForm] = useState<FormState>(() => makeInitialForm(getInitialSettings()));
  const [loading, setLoading] = useState(false);
  const [inventoryReady, setInventoryReady] = useState(false);
  const { addToast } = useToast();
  const [frequentItems, setFrequentItems] = useState<ItemHistory[]>([]);

  const [searchInput, setSearchInput] = useState('');
  const search = useDeferredValue(searchInput);
  const [filterLocation, setFilterLocation] = useState<FilterLocation>('all');
  const [sortField, setSortField] = useState<SortField>('expiresAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const barcodeImportRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const addItemNameRef = useRef<HTMLInputElement>(null);
  const shortcutsRef = useRef<HTMLDivElement>(null);
  const inventoryScrollRef = useRef<HTMLDivElement>(null);

  // Virtualizer for the inventory list view
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    estimateSize: () => 200,
    getScrollElement: () => inventoryScrollRef.current,
    overscan: 5,
  });
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  useFocusTrap(shortcutsRef, shortcutsOpen);
  const [barcodeImportProgress, setBarcodeImportProgress] = useState<{ done: number; total: number } | null>(null);

  const [scanModal, setScanModal] = useState<{
    qrDataUrl: string;
    serverUrl: string;
    status: 'waiting' | 'received';
  } | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [pwaScanOpen, setPwaScanOpen] = useState(false);
  const [platform, setPlatform] = useState<string | undefined>(undefined);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState | null>(null);
  const [drawerItem, setDrawerItem] = useState<InventoryItem | null>(null);
  const [chartsOpen, setChartsOpen] = useState(false);
  const [inventoryView, setInventoryView] = useState<'list' | 'timeline'>('list');
  const [, setHighlightedItemId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [statsVersion, setStatsVersion] = useState(0);
  const bumpStats = () => setStatsVersion((v) => v + 1);

  const [installPrompt, setInstallPrompt] = useState<{ prompt: () => Promise<void> } | null>(null);

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
  const [emailPaused, setEmailPaused] = useState(false);

  type RecipeSuggestion = { idMeal: string; strMeal: string; strMealThumb: string };
  const [recipeBanner, setRecipeBanner] = useState<RecipeSuggestion[] | null>(null);
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
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if ('electronAPI' in window) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as unknown as { prompt: () => Promise<void> });
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const toggleTheme = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const inInput = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
      if (e.key === 'Escape') {
        if (shortcutsOpen) { setShortcutsOpen(false); return; }
        if (drawerItem) { setDrawerItem(null); setEditingItemId(null); setEditForm(null); return; }
      }
      if (inInput) return;
      if (e.key === '?') { e.preventDefault(); setShortcutsOpen(o => !o); }
      if (e.key === 'n' || e.key === 'N') { setActiveTab('inventory'); setTimeout(() => addItemNameRef.current?.focus(), 50); }
      if (e.key === '/') { e.preventDefault(); setActiveTab('inventory'); setTimeout(() => searchRef.current?.focus(), 50); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [shortcutsOpen, drawerItem]);

  useEffect(() => {
    void loadInventory().then(result => { setItems(result); setInventoryReady(true); });
  }, [loadInventory]);

  useEffect(() => {
    void notifyExpiringItems(items, settings.expiryWarningDays, settings.notifications);
  }, [items, settings.expiryWarningDays, settings.notifications]);

  useEffect(() => {
    void inventoryService.frequentItems(5).then(setFrequentItems);
  }, []);

  useEffect(() => {
    void getWasteLog().then(setWasteLog);
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
    void window.beforeItsGone?.getEmailSettings?.().then((s) => { if (s?.paused) setEmailPaused(true); });
  }, []);

  useEffect(() => {
    window.beforeItsGone?.onDigestFire?.(async () => {
      const api = window.beforeItsGone;
      if (!api?.sendEmail) return;
      const emailSettings = await api.getEmailSettings?.();
      if (!emailSettings || emailSettings.paused || emailSettings.provider === 'none') return;

      const all = await inventoryService.list({});
      const expired = all.filter((i) => calculateExpiryStatus(i.expiresAt, settings.expiryWarningDays) === 'expired');
      const expiringSoon = all.filter((i) => calculateExpiryStatus(i.expiresAt, settings.expiryWarningDays) === 'expiring-soon');
      const depleted = getShoppingList(all);

      if (expired.length === 0 && expiringSoon.length === 0 && depleted.length === 0) return;

      const html = renderDigest({ expired, expiringSoon, depleted, digestType: emailSettings.digest === 'weekly' ? 'weekly' : 'daily' });
      await api.sendEmail({ subject: `Before It's Gone - ${emailSettings.digest} digest`, html });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.beforeItsGone?.onSaveItemFromPhone?.(async (data) => {
      await inventoryService.create({
        name: data.name,
        quantity: data.quantity,
        location: data.location,
        barcode: data.barcode || null,
        expiresAt: data.expiresAt ?? calculateExpiryDateISO(data.shelfLifeDays),
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

  const onSyncComplete = useCallback(() => {
    void loadInventory().then(setItems);
    bumpStats();
  }, [loadInventory]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SYNC_SETTINGS_STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as { enabled?: boolean; supabaseUrl?: string; supabaseAnonKey?: string };
      if (!s.enabled || !s.supabaseUrl || !s.supabaseAnonKey) return;
      void import('./SyncService.js').then(async ({ syncService }) => {
        syncService.connect(s.supabaseUrl!, s.supabaseAnonKey!);
        const user = await syncService.restoreSession();
        if (!user || !syncService.isReady()) return;
        const local = await listInventoryItems();
        const { merged } = await syncService.sync(local);
        for (const item of merged) await upsertInventoryItem(item);
        onSyncComplete();
      });
    } catch {
      // sync is best-effort
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [profileMap, setProfileMap] = useState<Map<string, { caloriesPer100g?: number | null; allergens?: string[] }>>(new Map());

  useEffect(() => {
    void inventoryService.allProfiles().then((profiles) => {
      setProfileMap(new Map(profiles.map((p) => [p.barcode, { caloriesPer100g: p.caloriesPer100g, allergens: p.allergens }])));
    });
  }, [statsVersion]);

  const [allItems, setAllItems] = useState<InventoryItem[]>([]);

  const expiringCount = useMemo(
    () => allItems.filter((i) => calculateExpiryStatus(i.expiresAt, settings.expiryWarningDays) !== 'fresh').length,
    [allItems, settings.expiryWarningDays]
  );

  useEffect(() => {
    if (expiringCount < 3) return;

    const firstExpiring = allItems.find((i) => calculateExpiryStatus(i.expiresAt, settings.expiryWarningDays) !== 'fresh');
    if (!firstExpiring) return;
    const ingredient = firstExpiring.name.split(' ')[0];
    void fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ingredient)}`)
      .then((r) => r.json())
      .then((data: { meals?: RecipeSuggestion[] | null }) => {
        const meals = data.meals;
        if (meals && meals.length > 0) setRecipeBanner(meals.slice(0, 3));
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiringCount]);

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

  const shoppingListItems = useMemo(() => getShoppingList(allItems), [allItems]);

  const formatShoppingListText = (listItems: InventoryItem[]) => {
    const date = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const lines = [
      "Shopping List - Before It's Gone",
      `Generated: ${date}`,
      '',
      ...listItems.map((item) => {
        const threshold = item.depletionThreshold;
        return `☐ ${item.name} (${item.quantity} left${threshold ? `, need ${threshold}+` : ''}) - ${item.location}`;
      })
    ];
    return lines.join('\n');
  };

  const onCopyShoppingList = async () => {
    await navigator.clipboard.writeText(formatShoppingListText(shoppingListItems));
    addToast('Shopping list copied to clipboard.');
  };

  const onExportShoppingList = () => {
    triggerDownload(formatShoppingListText(shoppingListItems), `shopping-list-${TODAY_ISO}.txt`, 'text/plain');
  };

  const onToggleTag = (tag: string) => {
    setActiveTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const doBarcodeLookup = useCallback(async (barcode: string) => {
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
        addToast('Loaded saved barcode profile.');
      } else {
        addToast('No saved profile for that barcode yet.', 'warning');
      }
    } finally {
      setLoading(false);
    }
  }, [addToast]);

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
      addToast('Could not start phone scanner. Check that no other app is using the port.', 'error');
    }
  };

  const onCloseScanModal = () => { setScanModal(null); };

  const onPwaBarcodeDetected = useCallback((barcode: string) => {
    setField('barcode', barcode);
    void doBarcodeLookup(barcode);
    setPwaScanOpen(false);
  }, [doBarcodeLookup]);

  const onClosePwaScan = useCallback(() => setPwaScanOpen(false), []);

  const onBarcodeLookup = async () => {
    const barcode = form.barcode.trim();
    if (!barcode) return;

    setLoading(true);
    try {
      const remoteName = await lookupBarcodeOnline(barcode);
      if (!remoteName) {
        addToast('No product name found from online lookup.', 'warning');
        return;
      }
      setField('name', remoteName);
      addToast('Loaded product name from barcode database.');
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
      tags: '',
      recurring: false,
      restockQuantity: '',
      photo: '',
    });
    addToast(`Pre-filled form from "${entry.name}" history.`);
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
        addToast('Notifications enabled for expiring items.');
        void notifyExpiringItems(items, settings.expiryWarningDays, settings.notifications);
      }
    } catch {
      setNotificationState('denied');
      addToast('Could not request notification permission.', 'error');
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
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        recurring: form.recurring,
        restockQuantity: form.restockQuantity ? Number(form.restockQuantity) : undefined,
        photo: form.photo || undefined,
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
      addToast('Item saved.');
      bumpStats();
      void inventoryService.frequentItems(5).then(setFrequentItems);
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item && calculateExpiryStatus(item.expiresAt, settings.expiryWarningDays) === 'expired') {
      const entry = await logWastedItem(item);
      setWasteLog((prev) => [entry, ...prev]);
    }
    await inventoryService.remove(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
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

    if (item.quantity === 0 && existing.recurring) {
      const restocked = await inventoryService.create({
        name: existing.name,
        quantity: existing.restockQuantity ?? 1,
        location: existing.location,
        barcode: existing.barcode,
        expiresAt: calculateExpiryDateISO(existing.shelfLifeDays ?? 7),
        shelfLifeDays: existing.shelfLifeDays,
        category: existing.category,
        depletionThreshold: existing.depletionThreshold,
        tags: existing.tags,
        recurring: true,
        restockQuantity: existing.restockQuantity,
      });
      setItems((prev) => [...prev, restocked]);
      bumpStats();
    }

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

  const buildEditForm = (item: InventoryItem): FormState => ({
    name: item.name,
    quantity: item.quantity,
    location: item.location,
    barcode: item.barcode ?? '',
    shelfLifeDays: item.shelfLifeDays ?? Math.max(1, Math.round(
      (new Date(item.expiresAt).getTime() - Date.now()) / 86400000
    )),
    expiryDate: (() => { const d = new Date(item.expiresAt); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })(),
    category: item.category ?? '',
    depletionThreshold: item.depletionThreshold != null ? String(item.depletionThreshold) : '',
    tags: item.tags?.join(', ') ?? '',
    recurring: item.recurring ?? false,
    restockQuantity: item.restockQuantity != null ? String(item.restockQuantity) : '',
    photo: item.photo ?? '',
  });

  const onEdit = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setEditingItemId(id);
    setEditForm(buildEditForm(item));
    setDrawerItem(item);
  };

  const onOpenDrawer = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) setDrawerItem(item);
  };

  const onDrawerStartEdit = () => {
    if (!drawerItem) return;
    setEditingItemId(drawerItem.id);
    setEditForm(buildEditForm(drawerItem));
  };

  const onEditSave = async () => {
    if (!editingItemId || !editForm) return;
    const name = editForm.name.trim();
    if (!name) return;
    setUndoPending((prev) => { if (prev) clearTimeout(prev.timer); return null; });
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
        tags: editForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
        recurring: editForm.recurring,
        restockQuantity: editForm.restockQuantity ? Number(editForm.restockQuantity) : undefined,
        photo: editForm.photo || undefined,
      });
      if (updated) {
        setItems((prev) => prev.map((i) => (i.id === editingItemId ? updated : i)));
        setDrawerItem(updated);
        bumpStats();
        addToast('Changes saved.');
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
    setDrawerItem(null);
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
        if (skipped > 0) extra = ` (${skipped} row${skipped > 1 ? 's' : ''} skipped - missing name/expires_at or invalid location)`;
      } else {
        const parsed = importExportService.parseJSON(text);
        count = await inventoryService.importJSON(parsed);
      }

      setItems(await loadInventory());
      bumpStats();
      addToast(`Imported ${count} items.${extra}`);
    } catch {
      addToast('Import failed - check the file format (JSON or CSV).', 'error');
    } finally {
      setLoading(false);
      if (importRef.current) importRef.current.value = '';
    }
  };

  const onClearAll = async () => {
    await inventoryService.clear();
    setItems([]);
    setShowClearConfirm(false);
    addToast('All inventory cleared.');
    bumpStats();
  };

  const onBarcodeImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const barcodes = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (barcodes.length === 0) { addToast('No barcodes found in file.', 'warning'); return; }

    setBarcodeImportProgress({ done: 0, total: barcodes.length });
    let imported = 0;

    for (let i = 0; i < barcodes.length; i++) {
      const barcode = barcodes[i];
      setBarcodeImportProgress({ done: i, total: barcodes.length });
      try {
        const res = await fetch(
          `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`
        );
        const data = res.ok
          ? (await res.json()) as { product?: { product_name?: string; categories_tags?: string[]; nutriments?: Record<string, unknown>; allergens_tags?: string[] } }
          : null;
        const p = data?.product;
        const name = p?.product_name?.trim() || barcode;
        const category = null;
        const rawCal = p?.nutriments?.['energy-kcal_100g'];
        const caloriesPer100g = typeof rawCal === 'number' ? Math.round(rawCal) : null;
        const allergens = (p?.allergens_tags ?? []).map((t) => t.replace(/^en:/, '')).filter(Boolean);
        const shelfLifeDays = settings.defaultShelfLifeDays;

        await inventoryService.create({
          name,
          quantity: 1,
          location: settings.defaultLocation,
          barcode,
          expiresAt: calculateExpiryDateISO(shelfLifeDays),
          shelfLifeDays,
          category,
        });

        await inventoryService.saveProfile({
          barcode,
          productName: name,
          defaultShelfLifeDays: shelfLifeDays,
          preferredLocation: settings.defaultLocation,
          caloriesPer100g,
          allergens,
        });

        imported++;
      } catch {
        // skip failed barcodes
      }
    }

    setBarcodeImportProgress(null);
    setItems(await loadInventory());
    bumpStats();
    addToast(`Imported ${imported} of ${barcodes.length} barcodes.`);
    if (barcodeImportRef.current) barcodeImportRef.current.value = '';
  };

  return (
    <>
    {updateBanner && (
      <div className="update-banner" role="status" aria-live="polite" data-state={updateBanner.state}>
        <span>
          {updateBanner.state === 'downloading' && `Downloading update v${updateBanner.version}…`}
          {updateBanner.state === 'ready' && (
            <>Update v{updateBanner.version} ready: <button type="button" onClick={() => { void window.beforeItsGone?.installUpdate?.(); }}>Restart to install</button></>
          )}
          {updateBanner.state === 'linux-link' && (
            <>Update v{updateBanner.version} available: <a href="https://github.com/AetherAssembly/Before-Its-Gone/releases/latest" target="_blank" rel="noopener noreferrer">Download</a></>
          )}
        </span>
        <button className="update-banner-dismiss" onClick={() => setUpdateBanner(null)} aria-label="Dismiss">&times;</button>
      </div>
    )}
    {emailPaused && (
      <div className="update-banner" data-state="downloading">
        <span>Email notifications are paused. <button className="btn-link" onClick={() => {
          void window.beforeItsGone?.getEmailSettings?.().then(async (s) => {
            if (!s) return;
            await window.beforeItsGone?.saveEmailSettings?.({ ...s, paused: false, resumeAt: null });
            setEmailPaused(false);
          });
        }}>Resume</button></span>
        <button className="update-banner-dismiss" onClick={() => setEmailPaused(false)} aria-label="Dismiss">&times;</button>
      </div>
    )}
    <a href="#main-content" className="skip-link">Skip to main content</a>
    <main className="app-shell" id="main-content">
      <header className="app-header">
        <div className="app-brand">
          <img src={`${import.meta.env.BASE_URL}icons/icon-192.svg`} className="brand-logo" width="40" height="40" alt="" aria-hidden="true" />
          <div className="brand-text">
            <h1>{t('app.title')}</h1>
            <p>{t('app.tagline')}</p>
          </div>
        </div>
        <div className="header-actions">
          {installPrompt && (
            <button
              className="btn-sm"
              onClick={() => {
                void installPrompt.prompt();
                setInstallPrompt(null);
              }}
              title={t('app.install')}
              aria-label={t('app.install')}
            >
              {t('app.install')}
            </button>
          )}
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
          <button className="about-trigger" onClick={() => setAboutOpen(true)} title="About" aria-label="About">&#9432;</button>
        </div>
      </header>
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} version={appVersion} />

      <nav className="tab-nav" role="tablist" aria-label="Main navigation">
        <button
          type="button"
          role="tab"
          id="tab-inventory"
          aria-selected={activeTab === 'inventory'}
          aria-controls="panel-inventory"
          className="tab-btn"
          data-active={activeTab === 'inventory' ? 'true' : undefined}
          onClick={() => setActiveTab('inventory')}
        >
          {t('tabs.inventory')}
        </button>
        <button
          type="button"
          role="tab"
          id="tab-shopping"
          aria-selected={activeTab === 'shopping'}
          aria-controls="panel-shopping"
          className="tab-btn"
          data-active={activeTab === 'shopping' ? 'true' : undefined}
          onClick={() => setActiveTab('shopping')}
        >
          {t('tabs.shoppingList')}{shoppingListItems.length > 0 && <span className="tab-badge" aria-hidden="true">{shoppingListItems.length}</span>}{shoppingListItems.length > 0 && <span className="sr-only">, {shoppingListItems.length} items</span>}
        </button>
        <button
          type="button"
          role="tab"
          id="tab-waste"
          aria-selected={activeTab === 'waste'}
          aria-controls="panel-waste"
          className="tab-btn"
          data-active={activeTab === 'waste' ? 'true' : undefined}
          onClick={() => setActiveTab('waste')}
        >
          {t('tabs.wasteLog')}{wasteLog.length > 0 && <span className="tab-badge" aria-hidden="true">{wasteLog.length}</span>}{wasteLog.length > 0 && <span className="sr-only">, {wasteLog.length} items</span>}
        </button>
        <button
          type="button"
          role="tab"
          id="tab-recipes"
          aria-selected={activeTab === 'recipes'}
          aria-controls="panel-recipes"
          className="tab-btn"
          data-active={activeTab === 'recipes' ? 'true' : undefined}
          onClick={() => setActiveTab('recipes')}
        >
          {t('tabs.recipes')}{recipeBanner && recipeBanner.length > 0 && expiringCount >= 3 && <span className="tab-badge" aria-hidden="true">{recipeBanner.length}</span>}{recipeBanner && recipeBanner.length > 0 && expiringCount >= 3 && <span className="sr-only">, {recipeBanner.length} suggestions</span>}
        </button>
        <button
          type="button"
          role="tab"
          id="tab-settings"
          aria-selected={activeTab === 'settings'}
          aria-controls="panel-settings"
          className="tab-btn"
          data-active={activeTab === 'settings' ? 'true' : undefined}
          onClick={() => setActiveTab('settings')}
        >
          {t('tabs.settings')}
        </button>
      </nav>

      {activeTab === 'shopping' && (
        <section className="panel" role="tabpanel" id="panel-shopping" aria-labelledby="tab-shopping" tabIndex={0}>
          <h2>Shopping List</h2>
          {shoppingListItems.length === 0 ? (
            <p className="status-msg">No items are below their low-stock threshold. Set a &ldquo;Low stock alert at&rdquo; value on an item to track it here.</p>
          ) : (
            <>
              <div className="shopping-list">
                {shoppingListItems.map((item) => (
                  <div key={item.id} className="shopping-row">
                    <span className="shopping-name">{item.name}</span>
                    <span className="shopping-meta">
                      {item.quantity} left
                      {item.depletionThreshold ? ` · need ${item.depletionThreshold}+` : ''}
                      {' · '}{item.location}
                    </span>
                  </div>
                ))}
              </div>
              <div className="data-actions">
                <button type="button" onClick={() => { void onCopyShoppingList(); }}>
                  Copy to clipboard
                </button>
                <button type="button" className="btn-ghost" onClick={onExportShoppingList}>
                  Export as text
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {activeTab === 'waste' && (
        <section className="panel" role="tabpanel" id="panel-waste" aria-labelledby="tab-waste" tabIndex={0}>
          <h2>Waste Log</h2>
          {wasteLog.length === 0 ? (
            <p className="status-msg">No wasted items recorded yet. Expired items are logged here when deleted.</p>
          ) : (
            <>
              {(() => {
                const grouped = wasteLog.reduce<Record<string, WasteLogEntry[]>>((acc, entry) => {
                  const month = new Date(entry.wastedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
                  (acc[month] ??= []).push(entry);
                  return acc;
                }, {});
                return Object.entries(grouped).map(([month, entries]) => (
                  <div key={month} className="waste-group">
                    <h3 className="waste-month">{month} <span className="waste-count">({entries.length} item{entries.length !== 1 ? 's' : ''})</span></h3>
                    <ul className="waste-list">
                      {entries.map((entry) => (
                        <li key={entry.id} className="waste-row">
                          <span className="waste-name">{entry.itemName}</span>
                          <span className="waste-meta">
                            {entry.quantity} unit{entry.quantity !== 1 ? 's' : ''}
                            {entry.category ? ` · ${entry.category}` : ''}
                            {' · '}{entry.location}
                            {' · '}expired {new Date(entry.expiresAt).toLocaleDateString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ));
              })()}
              <div className="data-actions">
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => { void clearWasteLog().then(() => setWasteLog([])); }}
                >
                  Clear waste log
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {activeTab === 'recipes' && (
        <section className="panel" role="tabpanel" id="panel-recipes" aria-labelledby="tab-recipes" tabIndex={0}>
          <h2>Recipe Ideas</h2>
          {expiringCount < 3 ? (
            <p className="status-msg">Recipe suggestions appear once 3 or more items are expiring soon or expired.</p>
          ) : !recipeBanner || recipeBanner.length === 0 ? (
            <p className="status-msg">No recipe suggestions found for your expiring items right now.</p>
          ) : (
            <>
              <p className="status-msg">Use your expiring items - recipe ideas:</p>
              <div className="recipe-cards">
                {recipeBanner.map((meal) => (
                  <a
                    key={meal.idMeal}
                    className="recipe-card"
                    href={`https://www.themealdb.com/meal/${meal.idMeal}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img src={meal.strMealThumb + '/preview'} alt={meal.strMeal} className="recipe-thumb" />
                    <span className="recipe-name">{meal.strMeal}</span>
                  </a>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {activeTab === 'settings' && (
        <section role="tabpanel" id="panel-settings" aria-labelledby="tab-settings" tabIndex={0}>
        <Suspense fallback={<div className="skeleton-card" aria-label="Loading settings" style={{ height: '200px' }} />}>
        <SettingsPanel
          settings={settings}
          onChange={onChangeSettings}
          notificationState={notificationState}
          onEnableNotifications={() => { void onNotificationEnable(); }}
          onSyncComplete={onSyncComplete}
        />
        </Suspense>
        </section>
      )}

      {activeTab === 'inventory' && <section role="tabpanel" id="panel-inventory" aria-labelledby="tab-inventory" tabIndex={0}>
      <section className="summary">
        <div className="summary-header">
          <div className="summary-grid" role="region" aria-label="Inventory statistics">
            <div className="stat-card" role="group" aria-label={`${totalCount} products`}>
              <span className="stat-value" aria-hidden="true">{totalCount}</span>
              <span className="stat-label" aria-hidden="true">products</span>
            </div>
            <div className="stat-card" role="group" aria-label={`${totalUnits} units`}>
              <span className="stat-value" aria-hidden="true">{totalUnits}</span>
              <span className="stat-label" aria-hidden="true">units</span>
            </div>
            <div className="stat-card stat-card--warning" role="group" aria-label={`${expiringThisWeek} expiring this week`}>
              <span className="stat-value" aria-hidden="true">{expiringThisWeek}</span>
              <span className="stat-label" aria-hidden="true">expiring this week</span>
            </div>
            <div className="stat-card stat-card--warning" role="group" aria-label={`${expiringSoonItems} expiring soon`}>
              <span className="stat-value" aria-hidden="true">{expiringSoonItems}</span>
              <span className="stat-label" aria-hidden="true">expiring soon</span>
            </div>
            <div className="stat-card stat-card--danger" role="group" aria-label={`${expiredItems} expired`}>
              <span className="stat-value" aria-hidden="true">{expiredItems}</span>
              <span className="stat-label" aria-hidden="true">expired</span>
            </div>
          </div>
          <button
            type="button"
            className="btn-ghost btn-sm charts-toggle"
            onClick={() => setChartsOpen(o => !o)}
            aria-expanded={chartsOpen}
          >
            {chartsOpen ? 'Hide charts' : 'Show charts'}
          </button>
        </div>
        {chartsOpen && (
          <Suspense fallback={<div className="skeleton-card" aria-label="Loading charts" style={{ height: '240px' }} />}>
            <StatsCharts items={allItems} warningWindowDays={settings.expiryWarningDays} />
          </Suspense>
        )}
      </section>

      {frequentItems.length > 0 && (
        <section className="panel" aria-labelledby="section-quick-add">
          <h2 id="section-quick-add">Quick add</h2>
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

      <section className="panel" aria-labelledby="section-add-item">
        <h2 id="section-add-item">Add item</h2>
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
                Scanner active - click to stop
              </button>
            ) : (
              <button type="button" onClick={() => void onScanWithPhone()} disabled={loading}>
                Scan with phone
              </button>
            )
          )}

          {!window.beforeItsGone && (
            <button type="button" onClick={() => setPwaScanOpen(true)} disabled={loading}>
              Scan barcode
            </button>
          )}

          <label>
            Name
            <input
              ref={addItemNameRef}
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
              placeholder="e.g. 2 - notify when &le; this many left"
              onChange={(e) => setField('depletionThreshold', e.target.value)}
            />
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.recurring}
              onChange={(e) => setField('recurring', e.target.checked)}
            />
            Auto-restock when depleted
          </label>

          {form.recurring && (
            <label>
              Restock quantity
              <input
                type="number"
                min={1}
                value={form.restockQuantity}
                placeholder="e.g. 3"
                onChange={(e) => setField('restockQuantity', e.target.value)}
              />
            </label>
          )}

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

          <div className="photo-field">
            {form.photo && (
              <div className="photo-preview-row">
                <img src={form.photo} alt="Item photo" className="photo-preview" />
                <button type="button" className="btn-ghost btn-sm" onClick={() => setField('photo', '')}>
                  Remove photo
                </button>
              </div>
            )}
            <label className="file-label btn-sm" style={{ display: 'inline-block' }}>
              {form.photo ? 'Replace photo' : 'Add photo (optional)'}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={async e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const dataUrl = await resizeImage(file);
                  setField('photo', dataUrl);
                  if (photoInputRef.current) photoInputRef.current.value = '';
                }}
              />
            </label>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Saving…' : 'Save item'}
          </button>
        </form>
      </section>

      <section className="panel" aria-labelledby="section-inventory">
        <div className="inventory-section-header">
          <h2 id="section-inventory">Inventory</h2>
          <div className="view-toggle" role="group" aria-label="Inventory view">
            <button
              type="button"
              className={`btn-sm${inventoryView === 'list' ? ' btn-view-active' : ' btn-ghost'}`}
              onClick={() => setInventoryView('list')}
              aria-pressed={inventoryView === 'list'}
            >
              List
            </button>
            <button
              type="button"
              className={`btn-sm${inventoryView === 'timeline' ? ' btn-view-active' : ' btn-ghost'}`}
              onClick={() => setInventoryView('timeline')}
              aria-pressed={inventoryView === 'timeline'}
            >
              Timeline
            </button>
          </div>
        </div>

        <div className="controls-row">
          <input
            ref={searchRef}
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
            aria-label={`Sort ${sortDirection === 'asc' ? 'ascending' : 'descending'} , click to toggle`}
          >
            {sortDirection === 'asc' ? '↑ Asc' : '↓ Desc'}
          </button>

          <button
            type="button"
            className="btn-ghost"
            onClick={() => { setBulkMode((m) => !m); setSelectedIds(new Set()); }}
            aria-label={bulkMode ? 'Cancel bulk selection' : 'Toggle bulk selection mode'}
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
            <div role="group" aria-label="Move selected to">
              <span aria-hidden="true">Move to:</span>
              <button type="button" className="btn-sm" onClick={() => void onMoveSelected('fridge')}>Fridge</button>
              <button type="button" className="btn-sm" onClick={() => void onMoveSelected('freezer')}>Freezer</button>
              <button type="button" className="btn-sm" onClick={() => void onMoveSelected('pantry')}>Pantry</button>
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
                aria-pressed={activeTags.includes(tag)}
                onClick={() => onToggleTag(tag)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onToggleTag(tag)}
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

        {inventoryReady && inventoryView === 'list' && (
          <div className="drop-zone-strip" aria-label="Drag here to move to location">
            {(['fridge', 'freezer', 'pantry'] as StorageLocation[]).concat(settings.customLocations).map(loc => (
              <div
                key={loc}
                className="drop-zone"
                onDragOver={e => e.preventDefault()}
                onDrop={() => {
                  if (!draggedId) return;
                  const id = draggedId;
                  setDraggedId(null);
                  void inventoryService.update(id, { location: loc }).then(updated => {
                    if (updated) { setItems(prev => prev.map(i => i.id === id ? updated : i)); bumpStats(); }
                  });
                }}
              >
                {loc}
              </div>
            ))}
          </div>
        )}

        {!inventoryReady ? (
          <div className="skeleton-grid" aria-label={t('inventory.loading')}>
            {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton-card" />)}
          </div>
        ) : inventoryView === 'timeline' ? (
          <ExpiryTimeline
            items={items}
            warningWindowDays={settings.expiryWarningDays}
            onSelect={(id) => {
              setHighlightedItemId(id);
              setInventoryView('list');
            }}
          />
        ) : (
          <ErrorBoundary>
          {items.length === 0 ? (
            <p>{t('inventory.noItems')}</p>
          ) : (
            <div
              ref={inventoryScrollRef}
              className="inventory-grid inventory-grid--virtual"
              style={{ overflowY: 'auto', height: '70vh' }}
            >
              <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const item = items[virtualRow.index];
                  return (
                    <div
                      key={item.id}
                      ref={virtualRow.measureElement}
                      draggable
                      onDragStart={() => setDraggedId(item.id)}
                      onDragEnd={() => setDraggedId(null)}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <InventoryCard
                        item={item}
                        onDelete={onDelete}
                        onDecrement={onDecrement}
                        onIncrement={onIncrement}
                        onEdit={onEdit}
                        onDetail={onOpenDrawer}
                        selected={bulkMode ? selectedIds.has(item.id) : undefined}
                        onToggleSelect={bulkMode ? onToggleSelect : undefined}
                        warningWindowDays={settings.expiryWarningDays}
                        onTagClick={onToggleTag}
                        caloriesPer100g={item.barcode ? profileMap.get(item.barcode)?.caloriesPer100g : undefined}
                        allergens={item.barcode ? profileMap.get(item.barcode)?.allergens : undefined}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          </ErrorBoundary>
        )}
      </section>

      <section className="panel" aria-labelledby="section-data">
        <h2 id="section-data">Data</h2>
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

          <label className="file-label">
            Import barcodes (.txt)
            <input
              ref={barcodeImportRef}
              type="file"
              accept=".txt,.csv"
              className="sr-only"
              onChange={(e) => { void onBarcodeImport(e); }}
            />
          </label>

          {barcodeImportProgress && (
            <div className="barcode-import-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.round((barcodeImportProgress.done / barcodeImportProgress.total) * 100)}%` }}
                />
              </div>
              <span className="progress-label">
                Looking up {barcodeImportProgress.done} / {barcodeImportProgress.total} barcodes…
              </span>
            </div>
          )}

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
      </section>}
    </main>

    <ErrorBoundary>
    <ItemDrawer
      item={drawerItem}
      editForm={editForm}
      loading={loading}
      customLocations={settings.customLocations}
      onStartEdit={onDrawerStartEdit}
      onEditFormChange={(updater) => setEditForm(f => f ? updater(f) : f)}
      onEditSave={() => { void onEditSave(); }}
      onClose={onEditCancel}
    />
    </ErrorBoundary>

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

    {pwaScanOpen && (
      <BarcodeScannerModal
        onDetected={onPwaBarcodeDetected}
        onClose={onClosePwaScan}
      />
    )}

    {shortcutsOpen && (
      <>
        <div className="shortcuts-overlay" onClick={() => setShortcutsOpen(false)} aria-hidden="true" />
        <div className="shortcuts-modal" role="dialog" aria-label="Keyboard shortcuts" aria-modal="true" ref={shortcutsRef}>
          <div className="shortcuts-modal-header">
            <h2>Keyboard Shortcuts</h2>
            <button type="button" className="drawer-close" onClick={() => setShortcutsOpen(false)} aria-label="Close">&#x2715;</button>
          </div>
          <dl className="shortcut-list">
            <dt><kbd>N</kbd></dt><dd>Open add item form</dd>
            <dt><kbd>/</kbd></dt><dd>Focus search</dd>
            <dt><kbd>Esc</kbd></dt><dd>Close drawer or modal</dd>
            <dt><kbd>?</kbd></dt><dd>Toggle this shortcuts list</dd>
          </dl>
        </div>
      </>
    )}
    </>
  );
}

export default App;
