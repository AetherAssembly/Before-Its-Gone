# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project uses semantic versioning.

## [1.0.0] - 2026-06-13

### Changed

- Promoted from release candidate to stable. No functional changes from rc.4.

### Removed

- Removed Flatpak plan. (not viable for Flathub submission) [a2d77b4](https://github.com/AetherAssembly/Before-Its-Gone/commit/a2d77b4059796426151f83e2465a56c1a0c3414a)

---

## [1.0.0-rc.4] - 2026-06-12

### Added

- **WCAG 2.1 AA accessibility (I08):** Full sweep of interactive elements. Tab navigation now uses the correct ARIA `tablist`/`tab`/`tabpanel` pattern with `aria-selected` and `aria-controls`. Tag filter chips have `aria-pressed`. Tab count badges include visually-hidden context text. Bulk "Move to" buttons are wrapped in a labelled `role="group"`. Skip-to-main-content link added. All named `<section>` elements have `aria-labelledby` pointing to their headings. Update banner carries `role="status"` and `aria-live="polite"`. `AboutDialog` now places `role="dialog"` on the inner dialog element (not the overlay) with `aria-labelledby`. Space bar now also activates tag filter chips alongside Enter. `@axe-core/react` wired into dev builds to surface remaining violations in the browser console.
- **Arch Linux PKGBUILD:** A `PKGBUILD` is now generated and attached to every GitHub release automatically. Arch users can download it and run `makepkg -si` to install directly from the release AppImage. Checksums and version strings are filled in by the release workflow.

### Internal

- Version bumped to `1.0.0-rc.4` across all five `package.json` files.
- Replaced all em dashes project-wide with context-appropriate punctuation (colon for introductions, semicolon for clause separation, comma for appositives). Affects docs, changelogs, workflow files, source comments, and template strings.

---

## [1.0.0-rc.3] - 2026-06-11

### Added

- **Web Worker for storage:** `InventoryService` now runs inside a dedicated Web Worker (`inventory.worker.ts`) exposed via Comlink. All IndexedDB reads and writes happen off the main thread, keeping the UI responsive during filtering, sorting, and bulk operations.
- **PWA install prompt:** The service worker is now properly registered on web builds (skipped in Electron). A `manifest.webmanifest` `<link>` is included in `index.html`. When the browser fires `beforeinstallprompt`, an **Install** button appears in the app header; clicking it triggers the native install flow.
- **i18n foundation:** `i18next` + `react-i18next` scaffolding added. English strings live in `apps/web/src/locales/en.json`. The app title, tagline, tab labels, inventory status messages, and the install button are now localised via `t()`. Add a new locale file and pass it to the `resources` map in `apps/web/src/i18n.ts` to add a language.

### Changed

- **Electron startup:** `qrcode` is now dynamically imported inside the `scanner:start` IPC handler instead of at module load time, reducing startup overhead. A `performance.mark` / `performance.measure` pair logs renderer-ready time to the console in development builds.
- **Rendering performance:** `.inventory-card` gains `content-visibility: auto; contain-intrinsic-size: 0 200px`, enabling browser-native off-screen rendering skipping for large inventories without breaking drag-and-drop or CSS grid layout.

---

## [1.0.0-rc.2] - 2026-06-09

### Fixed

- **XSS in coverage reporter:** `packages/core/coverage/sorter.js` read `colNode.innerHTML` and wrote it back as HTML when appending the sort indicator `<span>`, allowing DOM-text-to-HTML round-tripping. Replaced with `createElement` + `appendChild` so no existing DOM content is re-parsed as HTML (CWE-79).

### Changed

- **Package names renamed** to match the GitHub organisation scope: `@before-its-gone/core` → `@aetherAssembly/core`, `@before-its-gone/ui` → `@aetherAssembly/ui`. All import paths across `apps/web` and `packages/ui` updated accordingly.
- **GitHub Packages publishing:** `packages/core` and `packages/ui` are no longer private. Both carry a `publishConfig` pointing to `https://npm.pkg.github.com` and are published automatically on every `v*` tag via a new `publish-packages` job in `release.yml`. The `release.yml` workflow gains `packages: write` permission.
- **Bundle size (P05):** `SyncService` (Supabase + realtime/gotrue/storage-js, ~202 kB) is now a dynamic `import()` inside the startup `useEffect` in `App.tsx` instead of a static import. The main JS chunk shrinks from ~460 kB to ~258 kB. Users who never enable cloud sync no longer download the Supabase client at all. `chunkSizeWarningLimit` raised to 400 kB to reflect the intentional deferred `StatsCharts` chunk (recharts, already lazy-loaded since rc.1).

### Internal

- Version bumped to `1.0.0-rc.2` across all five `package.json` files.

---

## [1.0.0-rc.1] - 2026-06-08

### Added

- **Unit test suite:** Vitest infrastructure added for `packages/core`. 64 tests covering `calculateExpiryStatus`, `getShoppingList`, `getFilteredInventory`, `createInventoryItem`, `decrementItemQuantity`, `updateInventoryItem`, `incrementItemQuantity`, `deleteInventoryItem`, `calculateExpiryDateISO`, all CSV/JSON import-export functions, and waste log functions. 87% branch coverage on `inventory.ts`. Run with `npm run test` / `npm run test:coverage`.
- **React error boundaries:** `ErrorBoundary` class component wraps the inventory card grid and item drawer in `apps/web/src/`. A render crash in any inventory card now shows a recovery panel with a "Reload App" button instead of blanking the whole screen.
- **Focus trap hook:** `useFocusTrap` (`apps/web/src/useFocusTrap.ts`) constrains Tab/Shift+Tab navigation within open modals. Applied to the keyboard shortcuts modal and About dialog; focus returns to the trigger element on close.

### Changed

- `StatsCharts` and `SettingsPanel` are now lazy-loaded via `React.lazy` + `Suspense`. The recharts bundle (~355 kB) is split into a separate chunk and only fetched when the charts panel is first opened. Build chunk size warning threshold set to 300 kB in `vite.config.ts`.
- Stat cards in the inventory summary now carry `role="region"` / `role="group"` and descriptive `aria-label` values for screen readers.
- Sort direction and bulk-select buttons now have `aria-label` attributes.
- Custom location remove buttons in Settings now carry `aria-label={`Remove location ${loc}`}`.
- `ScanModal` now has `role="dialog"`, `aria-modal="true"`, and an Escape key handler.
- `AboutDialog` now traps focus and closes on Escape.
- `ItemDrawer` role changed from `complementary` to `dialog` with `aria-modal`.
- `packages/core/tsconfig.json` excludes `src/__tests__/**` so test files are not compiled into `dist/`.

### Internal

- Version bumped to `1.0.0-rc.1` across all five `package.json` files.

---

## [0.9.1] - 2026-06-03

### Changed

- Dependency updates only: `@typescript-eslint/eslint-plugin` 8.60.1, `@typescript-eslint/parser` 8.60.1, `concurrently` 10.0.3. No functional or behavioural changes.

---

## [0.9.0] - 2026-05-29

### Added

- **Dark/light mode toggle:** sun/moon button in the header switches between dark (default) and light themes. Choice is persisted in localStorage. All colors are now CSS custom properties, making the entire UI re-theme cleanly.
- **Animated background:** subtle `hue-rotate` animation on the page background (0-8 degrees over 12 seconds); imperceptible but adds life to the dark theme.
- **Glass morphism panels:** all `.panel` and `.stat-card` elements now use `backdrop-filter: blur(12px)` with a semi-transparent background, giving a frosted glass effect.
- **Toast notification system:** a `ToastProvider` context replaces all static status messages. Toasts appear bottom-right, auto-dismiss after 3 seconds, and have success (cyan), warning (amber), and error (rose) variants. The existing undo toast is preserved as a separate lower-level component.
- **Responsive layout:** new breakpoint at 480px stacks `.controls-row` vertically and makes all form fields full-width. Button min-height is 44px for touch targets. A 400px breakpoint tightens side padding further.
- **Loading skeleton states:** while the inventory loads on first render, 6 shimmer placeholder cards are shown instead of an empty list.
- **Stats charts:** a "Show charts" toggle in the inventory summary reveals three Recharts visualisations: a pie chart of items by location, a horizontal bar chart of items by category (top 8, rest grouped as "other"), and a vertical bar chart of items expiring within each of the next 7 days.
- **Expiry timeline view:** a segmented "List / Timeline" control above the inventory switches to a horizontal scrollable timeline. Items are shown as color-coded dots (fresh/expiring-soon/expired) on a date axis spanning today to the furthest expiry date. Clicking a dot switches back to list view.
- **Item detail drawer:** clicking any inventory card opens a slide-in drawer from the right showing all item fields. An "Edit item" button within the drawer reveals an inline edit form (same fields as before, including photo). The drawer closes on Esc, overlay click, or the X button. The previous inline edit panel has been removed.
- **Item photos:** a file picker (with canvas resize to 200x200 max, JPEG 0.75) is available on both the add-item form and the drawer edit form. Thumbnails (48x48, rounded) appear in the card header; the full image is shown at the top of the drawer detail view.
- **Keyboard shortcuts:** global keydown handler in App.tsx. `N` focuses the add-item name field (switching to the Inventory tab first); `/` focuses the search input; `Esc` closes the drawer or the shortcuts modal; `?` toggles a modal listing all shortcuts.
- **Drag-and-drop location move:** each inventory card is draggable. A strip of drop targets (one per location, including custom locations) appears above the grid while the inventory tab is active. Dropping a card on a target calls `inventoryService.update` with the new location.

### Changed

- `InventoryItem` and `NewInventoryItem` gain `photo?: string` (base64 data URL, stored in IndexedDB).
- `updateInventoryItem` patch type now includes `'photo'`.
- All em-dashes in code comments, toast messages, and doc strings replaced with hyphens or colons.
- Dependency bumps: `@types/node` 25.9.1, `@types/react` 19.2.15, `@supabase/supabase-js` 2.106.2, `@typescript-eslint/{eslint-plugin,parser}` 8.60.0, `electron` 42.2.0, `nodemailer` 8.0.8, `resend` 6.12.4, `vite` 8.0.14, `tmp` 0.2.7 (via overrides).
- `recharts` 3.x added as a dependency in `apps/web`.

---

## [0.8.0] - 2026-05-22

### Added

- **Settings panel:** new tab with default location, default shelf life, configurable expiry warning window, per-notification-type toggles, and custom storage locations. All settings persist in localStorage.
- **Custom storage locations:** add named locations beyond fridge / freezer / pantry (e.g. "Garage Chest Freezer", "Wine Cellar"). Custom locations appear in all location selects and the inventory filter.
- **Tag filtering:** clickable tag chips above the inventory list narrow the view to items that match all selected tags (AND semantics). Clicking a tag on an inventory card adds it to the active filter instantly.
- **Configurable expiry warning window:** the number of days before expiry at which items turn amber is now user-controlled (default 2). Previously hard-coded.
- **Shopping list tab:** automatically populated with any item whose quantity is at or below its low-stock threshold. Includes copy-to-clipboard and export-as-text buttons.
- **Waste log tab:** expired items are recorded to IndexedDB when deleted. The Waste Log panel groups entries by calendar month, shows item name, quantity, location, category, and expiry date. Entries can be cleared in bulk.
- **Recurring / auto-restock items:** items marked "auto-restock when depleted" automatically create a new item with the configured restock quantity and the same shelf life when their quantity reaches zero via the `− Use one` button.
- **Manual expiry date on phone scanner:** the product review card on the phone now includes a date picker that pre-fills with the predicted expiry date. Setting a date overrides the shelf-life calculation, and changing shelf-life days updates the date picker bidirectionally.
- **Email notifications:** optional email alerts delivered via Resend or SMTP. Configurable in Settings → Email Notifications. Supports daily or weekly digest (fires at a user-specified time), with 7-day / 30-day / indefinite pause/snooze. Credentials stored in `userData/email-settings.json`, never in localStorage or IndexedDB.
- **HTML email templates:** expiry alert, low-stock alert, and digest emails rendered with inline CSS and dark-brand styling, compatible with major email clients.
- **Nutritional info from Open Food Facts:** barcode scans now extract kcal/100g and allergen tags. Displayed as chips in the phone scanner's product review card and on inventory cards in the desktop app. Stored on the barcode profile.
- **Recipe suggestions:** when 3 or more items are expiring or expired, a dismissible banner fetches up to 3 recipe suggestions from TheMealDB using the first expiring item as the ingredient query. Dismissed for the current day via localStorage.
- **Batch barcode import:** "Import barcodes (.txt)" accepts a plain text file with one barcode per line. Each barcode is looked up on Open Food Facts; a new inventory item is created with the fetched name and the user's default shelf life and location. A live progress bar tracks enrichment.
- **Optional Supabase cloud sync:** opt-in sync to a user-owned Supabase project. Inventory is stored as JSONB rows with last-write-wins conflict resolution by `updatedAt`. Auto-syncs on launch if credentials are present. Sign-in, sign-up, sync-now, and sign-out controls in the Settings panel. Required SQL migration is shown inline. Existing offline-first path is completely untouched.
- **Auto-release CI:** `.github/workflows/release.yml` builds all four platform targets on a `v*` tag push and publishes artifacts plus `latest-linux.yml`, `latest-mac.yml`, and `latest.yml` manifests to the GitHub release. Fixes #24 (auto-updater manifest at wrong URL).

### Changed

- `StorageLocation` type extended from a fixed union to `'fridge' | 'freezer' | 'pantry' | (string & {})`, enabling custom location strings while preserving literal autocomplete.
- `InventoryItem` gains `recurring?: boolean` and `restockQuantity?: number`.
- `BarcodeProfile` gains `caloriesPer100g?: number | null` and `allergens?: string[]`.
- `AppSettings` gains `customLocations: string[]` and `notifications.lowStock: boolean`.
- `InventoryService.saveProfile()` and `allProfiles()` expose nutritional fields.
- `getFilteredInventory()` accepts `tags?: string[]` for AND-semantics tag filtering.
- Low-stock depletion notification is now gated on `settings.notifications.lowStock`.
- `notifyExpiringItems` respects the per-type notification toggles (`expiring`, `expired`).
- IndexedDB schema bumped to version 4 with a `wasteLog` object store.
- `release/` directory fully untracked from git; blanket `release/` gitignore entry replaces nine specific patterns.
- `CLAUDE.md` added to `.gitignore` so it never ships.

### Fixed

- `expiry-prediction.ts` TypeScript error (TS7053) when indexing `ShelfLifeByLocation` with a `StorageLocation` that includes the `string & {}` intersection ; fixed with a double cast.
- `PhoneSavePayload` type in `vite-env.d.ts` was missing `expiresAt: string | null`, causing TS2339 in App.tsx.
- `onQuickAdd` was missing `recurring` and `restockQuantity` fields in the `FormState` object it constructed, leaving the form in an incomplete state.

---

## [0.7.1] - 2026-05-19

### Added

- **Splash screen**: fridge icon and app name shown on the native background colour while the renderer loads, with a smooth fade-out once React mounts.
- **Branding in header**: app icon (40×40) displayed alongside the title in the main header.
- **About dialog**: ⓘ button in the header opens a modal with the app icon, version number, description, GitHub link, and license.
- **Auto-update**: `electron-updater` checks GitHub Releases on startup and shows an in-app banner. AppImage, NSIS, and DMG installs get a one-click "Restart to install" flow; deb/rpm installs get a direct link to the releases page instead (package manager installs can't be replaced without `sudo`).
- **arm64 cross-compilation**: `npm run package:linux:arm64` builds arm64 AppImage/deb/rpm locally from any x86_64 machine using electron-builder's built-in cross-compilation (no VM required).
- **arm64 CI**: `ubuntu-24.04-arm` added to the CI matrix so every PR is lint- and build-checked on native arm64.

### Changed

- **Window title** set explicitly to `"Before It's Gone"` in the `BrowserWindow` config, ensuring consistent taskbar and title-bar text across platforms.
- **Windows taskbar grouping**: `app.setAppUserModelId('com.beforeitsgone.app')` called before `app.whenReady()`, improving icon and grouping behaviour in the Windows taskbar.
- **Window icon** wired for dev mode (`icon: path.resolve(__dirname, '../assets/app-icon.png')`); production builds already receive the icon from electron-builder.
- **electron-builder publish config** set to `provider: github` on all three platform configs, enabling `latest*.yml` update manifest generation.
- **CI matrix** expanded from 3 runners to 4 (added `ubuntu-24.04-arm`).
- **README**: Arch/PKGBUILD installation section removed; arm64 cross-compilation script documented; version references updated to 0.7.1.

### Removed

- GitHub Actions release workflows for Linux, macOS, and Windows; builds are now produced locally and uploaded manually.
- VirusTotal scan workflow.
- AUR/PKGBUILD distribution: no longer maintained.

---

## [0.7.0] - 2026-05-19

### Added:

- **+ Add one button**: every inventory card now has a `+ Add one` button alongside `− Use one`, letting you increment stock without opening the edit form. Previously adding more of an existing item required editing it manually.
- **Undo "Use one"**: after tapping `− Use one`, a slide-in toast appears at the bottom of the screen for 5 seconds with an **Undo** button that restores the previous quantity.
- **CSV import**: the Data section now accepts `.csv` files alongside `.json`. Supported columns: `name`, `quantity`, `location`, `expires_at`, `barcode`, `category`, `shelf_life_days`, `tags` (semicolon-separated), `depletion_threshold`. Rows missing a required field or with an invalid location are skipped; the status message reports how many were skipped.

### Changed:

- **Search is debounced**: the inventory filter no longer re-runs on every keystroke. `useDeferredValue` defers the query to idle time, eliminating synchronous re-renders during fast typing.
- `InventoryItem` model gains an optional `shelfLifeDays?: number` field. The value is derived from the expiry date on create (or accepted as explicit input) and stored on the item. The edit form now shows the original shelf life instead of recalculating days remaining from today.
- The "Import JSON" label and file picker now read "Import JSON / CSV" and accept `.json` and `.csv`.
- **Service layer**: all database interactions are now routed through two dedicated service classes in `packages/core/src/services/`: `InventoryService` (CRUD, increment/decrement, import, barcode profiles, frequent items) and `ImportExportService` (JSON/CSV serialisation and parsing). `App.tsx` imports singleton instances instead of calling storage functions directly.
- **Scanner middleware chain**: the phone scanner's per-request auth, body parsing, and method enforcement are now composed from discrete middleware functions (`withMethod`, `withBodyJson`, `withAuth`, `withQueryToken`, `compose`) defined in `apps/electron/src/scanner-middleware.ts`. The previous inline `readBody` helper and repeated token-check blocks have been removed.
- **TypeScript project references**: `packages/core` and `packages/ui` are now `composite` projects. `packages/ui` references `packages/core`; `apps/electron` references both packages. A root `tsconfig.json` anchors the reference graph. `build:packages` now runs `tsc --build` instead of two sequential `npm --workspace` invocations, giving incremental compilation and enforced dependency ordering.

### Fixed:

- `allItems` re-fetch on every filter change: the useEffect watching the filtered `items` array caused a full `getFilteredInventory({})` call on every search keystroke, sort toggle, and location filter change. It now watches a `statsVersion` counter that only increments after writes (add, edit, delete, decrement, import, clear).
- Edit form showed days remaining instead of original shelf life: the "Shelf life (days)" field computed `(expiresAt − now) / dayMs`, giving days-remaining-from-today rather than the item's shelf life. The value is now stored as `shelfLifeDays` on create and read back in the edit form, with a fallback for items created before this fix.
- Scanner TLS cert regenerated every session: the phone scanner's self-signed certificate was recreated on every `startScannerServer` call, forcing phones to re-accept the browser security warning each session. The cert is now persisted to `userData/scanner-cert.json` with a 365-day TTL and regenerated only when missing or expired.
- Linux firewall rule failed silently on non-ufw systems: `tryAddLinuxFirewallRule` unconditionally ran `ufw allow`, which failed silently on Arch, Fedora, and openSUSE. It now probes `which ufw` first, falls back to `firewall-cmd --add-port --temporary`, and emits a `console.warn` with the port number if neither tool is found.
- Barcode dropped when the app window lost focus: the `scanner:barcode-received` IPC handler used `BrowserWindow.getFocusedWindow()?.webContents.send(...)` with optional chaining, silently dropping the event when the window was unfocused. Fixed to use `getFocusedWindow() ?? getAllWindows()[0]`, matching the existing pattern in the save handler.

---

## Previous Releases

### [0.6.0] - 2026-05-16

### Added:

- **Phone-as-primary scanner**: after scanning the QR code, the phone's camera auto-detects barcodes, looks up the product on Open Food Facts, and shows a full product card with image, predicted shelf life, location picker, and quantity stepper. Tapping "Save & scan next" saves the item directly to the desktop inventory and resets the camera. "Cancel" discards and returns to scanning.
- **Expiry prediction**: rule-based shelf life algorithm maps Open Food Facts category tags to per-location shelf life estimates (fridge / freezer / pantry) for dairy, meat, fish, produce, bread, canned, pasta/rice, beverages, snacks, frozen, eggs, condiments, and more.
- **In-place item editing**: inventory cards now have an Edit button that opens an inline edit form pre-filled with all existing fields. Changes are saved without removing and re-adding the item.
- **Multiple tags per item**: the Add and Edit forms accept a comma-separated tags field. Tags are stored as `string[]` on each inventory item and displayed as chips alongside the category on each card.
- **Bulk actions**: a "Bulk select" toggle enables checkboxes on every card. Selecting one or more items reveals a toolbar with "Delete selected" and "Move to: Fridge / Freezer / Pantry" buttons.
- **Silent phone-save refresh**: when the phone saves an item the desktop inventory list refreshes automatically without any toast or modal interruption.

### Changed:

- `InventoryItem` model gains a `tags: string[]` field (default `[]`, backwards-compatible).
- `startScannerServer` now accepts an `onSaveItem` callback; `POST /scan` returns full product data including `suggestedShelfLifeDays` and `imageUrl`; new `POST /save` endpoint handles phone-initiated saves.
- Scanner HTML page rewritten as a state machine: `scanning → looking-up → review → saving → saved → scanning`.
- ROADMAP updated: v0.6.0 marked current; expiry prediction removed from "Possible Future Directions" (shipped).

### Fixed:

- `updateInventoryItem` correctly patches any subset of fields and preserves all others including `tags` and `depletionThreshold`.

### Packaging:

- AppImage artifact (amd64): `before-its-gone-0.6.0.AppImage`
- Debian artifact (amd64): `before-its-gone_0.6.0_amd64.deb`
- RPM artifact (x86_64): `before-its-gone-0.6.0-x86_64.rpm`
- AppImage artifact (arm64): `before-its-gone-0.6.0-arm64.AppImage`
- Debian artifact (arm64): `before-its-gone_0.6.0_arm64.deb`
- RPM artifact (arm64): `before-its-gone-0.6.0-aarch64.rpm`
- macOS artifact: `Before Its Gone-0.6.0.dmg`
- Windows (portable) artifact: `before-its-gone-portable-0.6.0.exe`
- Windows (NSIS) artifact: `before-its-gone-setup-0.6.0.exe`

---

## Previous Releases:

### [0.5.5] - Private Beta

### Added:

- **Phone barcode scanner**: "Scan with phone" button next to the barcode field opens a modal with a QR code. Scanning it on any phone browser (iOS Safari, Android Chrome, Firefox, Edge, Opera) opens a camera view that decodes barcodes and sends the result directly to the desktop form field.
- The scanner page is served over **HTTPS with a self-signed certificate** so `getUserMedia` (camera access) works across all browsers, not just Chrome on Android.
- **BarcodeDetector API** is used natively on browsers that support it (Chromium); falls back to the **ZXing library** (loaded from CDN) for Safari and all other browsers.

### Changed:

- `package:windows` and `package:macos` scripts now use a cross-platform Node.js `mkdirSync` call instead of `mkdir -p`, which failed on Windows CMD.

### Fixed:

- LAN IP detection now filters out virtual network adapters (Docker, Hyper-V, VMware, VirtualBox, Bluetooth, VPN tunnels) and rejects any non-RFC-1918 address, preventing the QR code from containing a public or virtual IP.
- Windows Defender Firewall rule is automatically created for the scanner's port on each session start (requires the app to be run as Administrator once to stop dialog).

### Packaging:

- AppImage artifact (amd64): `before-its-gone-0.5.5.AppImage`
- Debian artifact (amd64): `before-its-gone_0.5.5_amd64.deb`
- RPM artifact (x86_64): `before-its-gone-0.5.5-x86_64.rpm`
- AppImage artifact (arm64): `before-its-gone-0.5.5-arm64.AppImage`
- Debian artifact (arm64): `before-its-gone_0.5.5_arm64.deb`
- RPM artifact (arm64): `before-its-gone-0.5.5-aarch64.rpm`
- macOS artifact: `Before Its Gone-0.5.5.dmg`
- Windows (portable) artifact: `before-its-gone-portable-0.5.5.exe`
- Windows (NSIS) artifact: `before-its-gone-setup-0.5.5.exe`

---

## [0.5.0] - 2026-05-14

### Added:

- **Categories**: Inventory items now support an optional category field (e.g. "dairy", "meat", "snacks") displayed as a pill on each card and searchable via the search bar.
- **Item history & quick-add buttons**: Every saved item is recorded in a local history store. The top 5 most-used items appear as one-click quick-add buttons that pre-fill the form, eliminating repeat entry.
- **Item suggestions from history**: Quick-add buttons show the item's category tag and use-count tooltip so you can distinguish similar entries at a glance.
- **Quantity depletion tracking**: Each item can optionally set a "low stock alert" threshold. Clicking "− Use one" decrements the quantity in place; when it hits the threshold a desktop notification fires.
- **"Use one" button**: Per-card decrement control lets you consume items without removing them.
- **Low stock notifications**: Native desktop notification when an item's quantity reaches or falls below its depletion threshold.
- **Export to JSON**: Download a full inventory snapshot as a portable JSON file.
- **Export to CSV**: Download inventory in CSV format for spreadsheet use.
- **Import from JSON**: Restore or merge a previous JSON export back into the app.
- **Clear all data**: One-click data wipe with a two-step confirmation guard.
- **Search**: Real-time filter across item name, barcode, and category.
- **Filter by location**: Show only fridge, freezer, or pantry items.
- **Sort controls**: Sort by expiry date, date added, or name; toggle ascending/descending.
- **Stats dashboard**: Summary cards show total products, total units, items expiring this week, expiring soon, and expired.
- **Consolidated monorepo**: Linux, macOS, and Windows now live in one repo with shared `packages/core` and `packages/ui`, separate `electron-builder` configs per platform, and dedicated release workflows.

### Packaging:

- AppImage artifact: `Before Its Gone-0.5.0.AppImage`
- Debian artifact: `before-its-gone_0.5.0_amd64.deb`
- CentOS artifact: `before-its-gone-0.5.0-x86_64.rpm`
- AppImage (arm64) artifact: `Before Its Gone-0.5.0-arm64.AppImage`
- Debian (arm64) artifact: `before-its-gone_0.5.0_arm64.deb`
- RPM (arm64) artifact: `before-its-gone-0.5.0-aarch64.rpm`
- macOS artifact: `Before Its Gone-0.5.0.dmg`

---

## [0.3.0] - 2026-05-10

### Added:

- Color-coded expiry status on inventory cards: amber left-border for expiring soon, rose left-border for expired. Allows scanning the inventory at a glance without reading status text.
- Loading state on the "Lookup barcode online" and "Save" buttons; they disable and show contextual text while async operations are in flight, preventing duplicate submissions.

### Fixed:

- Dead if/else branch in Electron `main.ts` where both arms called `loadURL` identically; collapsed to a single call.
- `JSON.parse` in the localStorage notification adapter now catches malformed data and returns `null` instead of throwing.
- `localStorage.setItem` in the notification adapter now catches `QuotaExceededError` silently; notification deduplication state is best-effort and should not crash the app.
- Removed collision-prone UUID fallback in `createInventoryItem`. `crypto.randomUUID()` is always available in Chromium/Electron; the `Date.now() + Math.random()` fallback was unreachable and unsafe.
- Startup `notifyExpiringItems` was being called twice on load (once directly after `setItems`, once via the `[items]` effect). Removed the redundant call.
- `Notification.requestPermission()` in `onNotificationEnable` is now wrapped in a try-catch; failures set the notification state to `denied` and surface a status message instead of failing silently.

### Packaging:

- AppImage artifact: `Before Its Gone-0.3.0.AppImage`
- Debian artifact: `before-its-gone_0.3.0_amd64.deb`

---

## [0.2.0] - 2026-04-16

This release is the major rework of Before It's Gone from a basic restarted scaffold into a desktop-first Linux application with practical food tracking features, packaging, and release infrastructure.

### Added:

- Native Linux desktop app workflow using Electron as the primary runtime.
- Barcode-aware inventory entry with local barcode profile storage for repeat item autofill.
- Optional online product lookup using Open Food Facts.
- Expiry tracking with shelf-life days and explicit expiry date support.
- Item expiry status classification: fresh, expiring soon, and expired.
- Summary counters for total items, expiring-soon items, and expired items.
- Local desktop notifications for expiring and expired inventory items.
- Wayland-aware Linux startup behavior with override support through `BIG_LINUX_DISPLAY_BACKEND`.
- Linux packaging for AppImage and `.deb` artifacts.
- New SVG and PNG application icon assets for renderer and desktop packaging.
- Release workflow that creates a draft GitHub release from a version tag.
- Release template with download/checksum placeholders.

### Packaging:

- AppImage artifact: `Before Its Gone-0.2.0.AppImage`
- Debian artifact: `electron_0.2.0_amd64.deb`
