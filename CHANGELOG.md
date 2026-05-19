# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project uses semantic versioning.

## [0.7.0] - [Private Beta]

### Added:

- **+ Add one button** — every inventory card now has a `+ Add one` button alongside `− Use one`, letting you increment stock without opening the edit form. Previously adding more of an existing item required editing it manually.
- **Undo "Use one"** — after tapping `− Use one`, a slide-in toast appears at the bottom of the screen for 5 seconds with an **Undo** button that restores the previous quantity.
- **CSV import** — the Data section now accepts `.csv` files alongside `.json`. Supported columns: `name`, `quantity`, `location`, `expires_at`, `barcode`, `category`, `shelf_life_days`, `tags` (semicolon-separated), `depletion_threshold`. Rows missing a required field or with an invalid location are skipped; the status message reports how many were skipped.

### Changed:

- **Search is debounced** — the inventory filter no longer re-runs on every keystroke. `useDeferredValue` defers the query to idle time, eliminating synchronous re-renders during fast typing.
- `InventoryItem` model gains an optional `shelfLifeDays?: number` field. The value is derived from the expiry date on create (or accepted as explicit input) and stored on the item. The edit form now shows the original shelf life instead of recalculating days remaining from today.
- The "Import JSON" label and file picker now read "Import JSON / CSV" and accept `.json` and `.csv`.
- **Service layer** — all database interactions are now routed through two dedicated service classes in `packages/core/src/services/`: `InventoryService` (CRUD, increment/decrement, import, barcode profiles, frequent items) and `ImportExportService` (JSON/CSV serialisation and parsing). `App.tsx` imports singleton instances instead of calling storage functions directly.
- **Scanner middleware chain** — the phone scanner's per-request auth, body parsing, and method enforcement are now composed from discrete middleware functions (`withMethod`, `withBodyJson`, `withAuth`, `withQueryToken`, `compose`) defined in `apps/electron/src/scanner-middleware.ts`. The previous inline `readBody` helper and repeated token-check blocks have been removed.
- **TypeScript project references** — `packages/core` and `packages/ui` are now `composite` projects. `packages/ui` references `packages/core`; `apps/electron` references both packages. A root `tsconfig.json` anchors the reference graph. `build:packages` now runs `tsc --build` instead of two sequential `npm --workspace` invocations, giving incremental compilation and enforced dependency ordering.

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

- **Phone-as-primary scanner** — after scanning the QR code, the phone's camera auto-detects barcodes, looks up the product on Open Food Facts, and shows a full product card with image, predicted shelf life, location picker, and quantity stepper. Tapping "Save & scan next" saves the item directly to the desktop inventory and resets the camera. "Cancel" discards and returns to scanning.
- **Expiry prediction** — rule-based shelf life algorithm maps Open Food Facts category tags to per-location shelf life estimates (fridge / freezer / pantry) for dairy, meat, fish, produce, bread, canned, pasta/rice, beverages, snacks, frozen, eggs, condiments, and more.
- **In-place item editing** — inventory cards now have an Edit button that opens an inline edit form pre-filled with all existing fields. Changes are saved without removing and re-adding the item.
- **Multiple tags per item** — the Add and Edit forms accept a comma-separated tags field. Tags are stored as `string[]` on each inventory item and displayed as chips alongside the category on each card.
- **Bulk actions** — a "Bulk select" toggle enables checkboxes on every card. Selecting one or more items reveals a toolbar with "Delete selected" and "Move to: Fridge / Freezer / Pantry" buttons.
- **Silent phone-save refresh** — when the phone saves an item the desktop inventory list refreshes automatically without any toast or modal interruption.

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

- **Phone barcode scanner** — "Scan with phone" button next to the barcode field opens a modal with a QR code. Scanning it on any phone browser (iOS Safari, Android Chrome, Firefox, Edge, Opera) opens a camera view that decodes barcodes and sends the result directly to the desktop form field.
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

- **Categories** — Inventory items now support an optional category field (e.g. "dairy", "meat", "snacks") displayed as a pill on each card and searchable via the search bar.
- **Item history & quick-add buttons** — Every saved item is recorded in a local history store. The top 5 most-used items appear as one-click quick-add buttons that pre-fill the form, eliminating repeat entry.
- **Item suggestions from history** — Quick-add buttons show the item's category tag and use-count tooltip so you can distinguish similar entries at a glance.
- **Quantity depletion tracking** — Each item can optionally set a "low stock alert" threshold. Clicking "− Use one" decrements the quantity in place; when it hits the threshold a desktop notification fires.
- **"Use one" button** — Per-card decrement control lets you consume items without removing them.
- **Low stock notifications** — Native desktop notification when an item's quantity reaches or falls below its depletion threshold.
- **Export to JSON** — Download a full inventory snapshot as a portable JSON file.
- **Export to CSV** — Download inventory in CSV format for spreadsheet use.
- **Import from JSON** — Restore or merge a previous JSON export back into the app.
- **Clear all data** — One-click data wipe with a two-step confirmation guard.
- **Search** — Real-time filter across item name, barcode, and category.
- **Filter by location** — Show only fridge, freezer, or pantry items.
- **Sort controls** — Sort by expiry date, date added, or name; toggle ascending/descending.
- **Stats dashboard** — Summary cards show total products, total units, items expiring this week, expiring soon, and expired.
- **Consolidated monorepo** — Linux, macOS, and Windows now live in one repo with shared `packages/core` and `packages/ui`, separate `electron-builder` configs per platform, and dedicated release workflows.

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
- Loading state on the "Lookup barcode online" and "Save" buttons — they disable and show contextual text while async operations are in flight, preventing duplicate submissions.

### Fixed:

- Dead if/else branch in Electron `main.ts` where both arms called `loadURL` identically — collapsed to a single call.
- `JSON.parse` in the localStorage notification adapter now catches malformed data and returns `null` instead of throwing.
- `localStorage.setItem` in the notification adapter now catches `QuotaExceededError` silently — notification deduplication state is best-effort and should not crash the app.
- Removed collision-prone UUID fallback in `createInventoryItem`. `crypto.randomUUID()` is always available in Chromium/Electron — the `Date.now() + Math.random()` fallback was unreachable and unsafe.
- Startup `notifyExpiringItems` was being called twice on load (once directly after `setItems`, once via the `[items]` effect). Removed the redundant call.
- `Notification.requestPermission()` in `onNotificationEnable` is now wrapped in a try-catch — failures set the notification state to `denied` and surface a status message instead of failing silently.

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
