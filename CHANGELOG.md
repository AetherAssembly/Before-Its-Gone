# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project uses semantic versioning.

## [0.5.0] - 2026-05-14

### Added

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

### Platform

- Linux: AppImage + `.deb` via `npm run package:linux`
- macOS: DMG + ZIP via `npm run package:macos` (see `packaging/macos/` for notarization notes)
- Windows: NSIS installer + portable `.exe` via `npm run package:windows` (see `packaging/windows/` for signing notes)

---

## [0.3.0] - 2026-05-10

### Added

- Color-coded expiry status on inventory cards: amber left-border for expiring soon, rose left-border for expired. Allows scanning the inventory at a glance without reading status text.
- Loading state on the "Lookup barcode online" and "Save" buttons — they disable and show contextual text while async operations are in flight, preventing duplicate submissions.

### Fixed

- Dead if/else branch in Electron `main.ts` where both arms called `loadURL` identically — collapsed to a single call.
- `JSON.parse` in the localStorage notification adapter now catches malformed data and returns `null` instead of throwing.
- `localStorage.setItem` in the notification adapter now catches `QuotaExceededError` silently — notification deduplication state is best-effort and should not crash the app.
- Removed collision-prone UUID fallback in `createInventoryItem`. `crypto.randomUUID()` is always available in Chromium/Electron — the `Date.now() + Math.random()` fallback was unreachable and unsafe.
- Startup `notifyExpiringItems` was being called twice on load (once directly after `setItems`, once via the `[items]` effect). Removed the redundant call.
- `Notification.requestPermission()` in `onNotificationEnable` is now wrapped in a try-catch — failures set the notification state to `denied` and surface a status message instead of failing silently.

### Packaging

- AppImage artifact: `Before Its Gone-0.3.0.AppImage`
- Debian artifact: `before-its-gone_0.3.0_amd64.deb`

---

## [0.2.0] - 2026-04-16

This release is the major rework of Before It's Gone from a basic restarted scaffold into a desktop-first Linux application with practical food tracking features, packaging, and release infrastructure.

### Added

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

### Packaging

- AppImage artifact: `Before Its Gone-0.2.0.AppImage`
- Debian artifact: `electron_0.2.0_amd64.deb`
