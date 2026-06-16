# Architecture Overview

This document describes the technical structure of Before It's Gone: how the codebase is organized, how data moves between layers, and where to look when adding or changing something.

---

## Monorepo layout

```bash
Before-Its-Gone/
├── packages/
│   ├── core/          # Business logic, database, types (shared)
│   └── ui/            # Shared React components
├── apps/
│   ├── web/           # Vite + React renderer (also built for PWA)
│   └── electron/      # Electron main process
├── docker/            # Self-hosted PWA deployment (Dockerfile, nginx, compose)
└── .github/workflows/   # CI and release automation
```

All packages are npm workspaces. The dependency graph is strictly one-directional:

```bash
apps/electron  ──►  packages/core
apps/web       ──►  packages/core
apps/web       ──►  packages/ui
packages/ui    ──►  packages/core
```

`packages/core` has no dependency on any app. This keeps business logic portable and testable without Electron or a browser.

---

## Packages

### `packages/core`

All inventory logic, storage, and shared types.

| File | Responsibility |
| ---- | -------------- |
| `src/models.ts` | TypeScript interfaces: `InventoryItem`, `BarcodeProfile`, `WasteLogEntry`, `AppSettings`, `SyncSettings` |
| `src/storage.ts` | IndexedDB schema (via `idb`), CRUD operations, `BrowserLocalStorageAdapter` |
| `src/inventory.ts` | `getFilteredInventory()`, `calculateExpiryStatus()`, `parseInventoryCSV()`, `parseInventoryJSON()` |
| `src/expiry-prediction.ts` | Shelf-life lookup by food category |
| `src/email-templates.ts` | HTML email template functions (pure, no dependencies) |
| `src/services/InventoryService.ts` | High-level service wrapping storage calls |
| `src/services/ImportExportService.ts` | CSV/JSON import-export orchestration |
| `src/index.ts` | Public API barrel; import from `@aetherAssembly/core` |

**Storage:** The app uses two storage mechanisms:

- **IndexedDB** (via the `idb` library): structured item data. Schema is version-gated:
  - v2: `inventory`, `barcodeProfiles`
  - v3: `itemHistory`
  - v4: `wasteLog`
- **localStorage** (via `BrowserLocalStorageAdapter`): user preferences and sync state. Keys:
  - `before-its-gone.settings`: `AppSettings` (expiry window, custom locations, etc.)
  - `before-its-gone.sync`: `SyncSettings` (Supabase URL, anon key, lastSyncedAt)
  - `before-its-gone.recipe-dismiss-{date}`: recipe banner dismiss state
  - `supabase.auth.token`: Supabase session (managed by Supabase SDK)

No `electron-store` is used anywhere. All renderer-accessible state lives in the browser storage APIs above.

### `packages/ui`

One component: `InventoryCard`. It renders a single inventory item with expiry status, quantity controls, nutrition chips, and tag display. Props are typed from `packages/core/src/models.ts`.

### `apps/web`

Vite + React single-page application. Entry: `src/main.tsx` → `src/App.tsx`.

`App.tsx` owns:

- All React state (inventory list, filter state, active tab, form state, banners)
- IPC calls to Electron (wrapped behind `window.beforeItsGone.*` feature-detect guards)
- Settings loading/saving via `BrowserLocalStorageAdapter`
- The tab shell: **Inventory**, **Shopping List**, **Waste Log**, **Data**, **Settings**

`SettingsPanel.tsx` owns:

- App preferences (expiry window, locations, notifications)
- Email notification settings (form, snooze, test send)
- Cloud sync (Supabase credentials, sign-in, sync-now)

`SyncService.ts` wraps `@supabase/supabase-js` with a simplified API (`connect`, `signIn`, `signUp`, `sync`). The `sync()` method pushes all local items to Supabase as JSONB rows, then pulls and applies last-write-wins conflict resolution by `updatedAt` timestamp. `SyncService` is dynamically imported in `App.tsx` (on-demand at startup only when sync credentials are configured) and statically imported in `SettingsPanel.tsx` (which is itself lazy-loaded). This keeps the ~202 kB Supabase bundle out of the initial JS chunk.

`inventory.worker.ts` hosts an `InventoryService` instance inside a dedicated Web Worker, exposed via [Comlink](https://github.com/GoogleChromeLabs/comlink). `inventoryWorkerService.ts` provides a module-level singleton `Remote<InventoryService>` proxy; the interface is identical to the main-thread version so `App.tsx` uses it transparently. All IndexedDB reads/writes happen off the main thread.

`i18n.ts` initialises `i18next` with the `react-i18next` plugin. String resources live in `src/locales/<lang>.json`. Only English (`en`) ships currently; add a new locale file and register it in `i18n.ts` to add a language. Components consume strings via the `useTranslation` hook (`t('key')`).

`BarcodeScannerModal.tsx` provides in-browser barcode scanning via `@zxing/browser`'s `BrowserMultiFormatReader`. It is rendered in `App.tsx` when `window.beforeItsGone` is absent (i.e. running as a PWA, not inside Electron). When a barcode is detected, the raw string is passed to `doBarcodeLookup`, which calls Open Food Facts directly from the browser (no relay server needed in PWA mode). The Electron phone-relay flow (`ScanModal` + `scanner-server.ts`) remains active when running inside Electron.

`main.tsx` registers the service worker (generated by `vite-plugin-pwa`) for web builds, skipped in Electron via `'electronAPI' in window`. The plugin runs in `autoUpdate` mode: it generates a precache manifest covering all hashed build assets and adds a `NetworkFirst` runtime cache for Open Food Facts API calls (`world.openfoodfacts.org`), so previously looked-up products resolve offline. It also captures the `beforeinstallprompt` event so `App.tsx` can surface a native **Install** button when the browser deems the PWA installable. In development (`import.meta.env.DEV`) it also dynamically imports `@axe-core/react`, which runs axe accessibility checks after each render and logs any WCAG violations to the browser console.

### `apps/electron`

Electron main process. Not bundled by Vite; compiled by `tsc` to `dist/`, then loaded by electron-builder.

| File | Responsibility |
| ---- | -------------- |
| `src/main.ts` | App lifecycle, BrowserWindow, IPC handlers, auto-updater, digest scheduler |
| `src/preload.ts` | `contextBridge`: the only bridge between renderer and main |
| `src/scanner-server.ts` | Self-signed HTTPS server (port 45678), Open Food Facts lookup, IPC notification |
| `src/scanner-html.ts` | HTML/JS for the phone's camera + product review card page |
| `src/scanner-middleware.ts` | Request routing for the scanner server |
| `src/email-service.ts` | `readEmailSettings`, `writeEmailSettings`, `sendEmail`, `DigestScheduler` |

---

## IPC bridge

The renderer (web app) cannot access Node.js APIs directly. All privileged operations go through a strict bridge defined in `preload.ts`:

```bash
Renderer (React)
  └─► window.beforeItsGone.*   (contextBridge API)
        └─► ipcRenderer.invoke(channel, ...args)
              └─► ipcMain.handle(channel, handler)   (Electron main)
```

**Exposed channels:**

| Channel | Direction | Purpose |
| ------- | --------- | ------- |
| `app:version` | R→M | Get app version string |
| `app:ping` | R→M | Health check |
| `app:platform` | R→M | Get `process.platform` |
| `scanner:start` | R→M | Start the phone scanner HTTPS server |
| `scanner:stop` | R→M | Stop the scanner server |
| `scanner:save-done` | R→M | Notify scanner server that item was saved |
| `scanner:save-error` | R→M | Notify scanner server of save error |
| `scanner:result` | M→R | Push scanned product data to renderer |
| `updater:install` | R→M | Quit and install downloaded update |
| `updater:download` | R→M | Begin update download |
| `email:get-settings` | R→M | Read `email-settings.json` from userData |
| `email:save-settings` | R→M | Write `email-settings.json` to userData |
| `email:send` | R→M | Send an email via the configured provider |
| `email:digest-fire` | M→R | Trigger renderer to build and send the digest |

The renderer always guards IPC calls: `if (window.beforeItsGone?.startScanner)`; the web-only build (no Electron) degrades gracefully without throwing.

---

## Barcode scanning

Two scan paths exist; which one runs depends on the deployment context:

**PWA (in-browser):** `BarcodeScannerModal` uses `BrowserMultiFormatReader` from `@zxing/browser` to open the device camera via `getUserMedia`. The phone or tablet running the PWA scans directly in the same browser session. Open Food Facts lookup happens in the renderer via `fetch` (no proxy needed). This path is active whenever `window.beforeItsGone` is absent.

**Electron (phone-relay):** a local HTTPS server embedded in the Electron main process serves a camera page to a separate phone on the same network. The phone scans, the server proxies the Open Food Facts lookup (needed to bypass CSP in packaged Electron apps), and the result is pushed to the renderer via IPC. This path is active when `window.beforeItsGone?.startBarcodeServer` is present.

### Electron phone scanner detail

```bash
Phone browser
  └─► HTTPS GET https://{local-ip}:45678/   (self-signed cert, stored in userData)
        └─► scanner-html.ts renders camera page
              └─► getUserMedia() → BarcodeDetector API
                    └─► POST /save  (barcode + product data)
                          └─► scanner-server.ts → ipcMain emits scanner:result
                                └─► Renderer receives, shows ScanModal
```

The self-signed certificate is generated once at first launch and stored in `userData/ssl/`. The QR code shown in `ScanModal` encodes the full HTTPS URL including the local IP address.

Open Food Facts lookup happens in `scanner-server.ts` (Node.js side) because the browser's content security policy would block cross-origin fetches to `world.openfoodfacts.org` from the renderer in a packaged app. The scanner server performs the lookup and returns enriched product data to the renderer via IPC.

---

## Email pipeline

```bash
DigestScheduler (main process, setInterval 60s)
  └─► Checks time + digest settings from email-settings.json
        └─► Emits email:digest-fire IPC to renderer
              └─► App.tsx onDigestFire handler
                    └─► Queries IndexedDB for all items
                          └─► renderDigest() (email-templates.ts)
                                └─► Calls window.beforeItsGone.sendEmail(payload)
                                      └─► email:send IPC → email-service.ts
                                            └─► Resend SDK or nodemailer (SMTP)
```

Email credentials are stored in `{userData}/email-settings.json`; never in localStorage or IndexedDB. The file is written only by the Electron main process and is not accessible from the renderer directly.

---

## Cloud sync

Supabase sync is handled entirely in the renderer (no IPC required; `@supabase/supabase-js` is a browser-compatible library):

```bash
SyncService.sync(localItems)
  ├─► UPSERT all local items → inventory_sync table
  │     (id, user_id, updated_at, data jsonb)
  └─► SELECT all remote items → merge by updatedAt (last-write-wins)
        └─► upsertInventoryItem() for items where remote is newer
```

The full `InventoryItem` is stored as a JSONB `data` column. This avoids camelCase→snake_case column mapping and means schema changes to `InventoryItem` don't require SQL migrations (only the SQL migration for the table itself is needed, run once at setup).

Deletions are not propagated; deleted items reappear after sync from another device. This is a known limitation documented in `docs/cloud-sync.md`.

---

## Self-hosted PWA deployment

The `docker/` folder contains everything needed to self-host `apps/web` as an installable PWA:

| File | Purpose |
| ---- | ------- |
| `docker/Dockerfile` | Multi-stage build: `node:22-alpine` runs `npm ci` + `npm run build:web`; `nginx:alpine` serves `apps/web/dist/` |
| `docker/nginx.conf` | HTTPS on port 443, SPA fallback to `index.html`, 1-year cache headers for hashed static assets, `no-store` for `sw.js` |
| `docker/docker-compose.yml` | Single `big-pwa` service, `restart: unless-stopped`, port `443:443` |
| `docker/certs/` | Self-signed cert (`cert.pem` + `key.pem`); gitignored — generated once on the host |

Vite's `server.host: true` binds the dev server to `0.0.0.0` so `npm run dev:web` is reachable from other devices on the LAN during development without Docker.

---

## Build pipeline

```bash
npm run build
  ├── build:packages   → tsc --build packages/core packages/ui  (incremental)
  ├── build:web        → vite build apps/web  (outputs to apps/web/dist/)
  └── build:electron   → tsc apps/electron/tsconfig.json  (outputs to apps/electron/dist/)
```

Packaging (electron-builder, triggered by `npm run package:<platform>`):

- Bundles `apps/web/dist/` as the renderer
- Bundles `apps/electron/dist/` as the main process
- Produces platform artifacts in `release/` (gitignored)

Auto-release (`.github/workflows/release.yml`):

- Triggers on any `v*` tag push
- Matrix build across ubuntu/macos/windows runners
- Each runner calls `electron-builder --publish always`
- Artifacts and update manifests (`latest-linux.yml`, `latest-mac.yml`, `latest.yml`) are attached to the GitHub release automatically
- A post-build job downloads the Linux AppImages, computes their SHA-256 checksums, fills them into the `PKGBUILD` template, and attaches the resulting `PKGBUILD` to the release for Arch Linux users
- npm packages (`@aetherAssembly/core`, `@aetherAssembly/ui`) are published to GitHub Packages on every tagged release

---

## Key architectural decisions

**Why no `electron-store`?**
`BrowserLocalStorageAdapter` from `packages/core` already handles all key-value persistence in the renderer. Adding `electron-store` would require IPC round-trips for settings that don't need main-process access. The only file that legitimately needs to live outside the renderer's storage is `email-settings.json` (credentials shouldn't be in IndexedDB, which is easier to inspect).

**Why JSONB for cloud sync instead of column-per-field?**
Mapping every `InventoryItem` field to a typed SQL column requires a migration every time the model changes. Storing the item as `data jsonb` means the schema is stable; only `id`, `user_id`, and `updated_at` need to be indexed SQL columns.

**Why does the digest scheduler live in main instead of a renderer `setInterval`?**
The renderer can be hidden or garbage-collected on some platforms when the window is minimized. The main process runs for the lifetime of the app, making it reliable for background scheduling.

**Why does Open Food Facts lookup happen in the scanner server (Node.js) rather than the renderer?**
Packaged Electron apps apply a strict Content Security Policy. The renderer cannot make cross-origin XHR/fetch requests to arbitrary external APIs without relaxing CSP. The scanner server (already running in Node.js) proxies the lookup without any CSP constraint.
