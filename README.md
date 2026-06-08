# Before It's Gone

> Track what's in your fridge, freezer, and pantry before it expires.

[![CI](https://github.com/AetherAssembly/Before-Its-Gone/actions/workflows/ci.yml/badge.svg)](https://github.com/AetherAssembly/Before-Its-Gone/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/AetherAssembly/Before-Its-Gone?include_prereleases&label=release)](https://github.com/AetherAssembly/Before-Its-Gone/releases)
[![License: AGPL v3](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)
[![Electron](https://img.shields.io/badge/electron-42-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22.12-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

[![Linux](https://img.shields.io/badge/Linux-AppImage%20%C2%B7%20.deb%20%C2%B7%20.rpm-FCC624?logo=linux&logoColor=black)](https://github.com/AetherAssembly/Before-Its-Gone/releases)
[![macOS](https://img.shields.io/badge/macOS-DMG-000000?logo=apple&logoColor=white)](https://github.com/AetherAssembly/Before-Its-Gone/releases)
[![Windows](https://img.shields.io/badge/Windows-Installer%20%C2%B7%20Portable-0078D4?logo=windows&logoColor=white)](https://github.com/AetherAssembly/Before-Its-Gone/releases)

Offline-first desktop app — no account required, all data stays on your machine.

> **v1.0.0 Release Candidate** — All planned features are complete. This build has full test coverage, React error boundaries, lazy-loaded charts, and accessibility improvements. Please [report any issues](https://github.com/AetherAssembly/Before-Its-Gone/issues/new?template=bug_report.yml) before the stable release.

---

## Features

### Inventory

- Barcode scanning with local profile storage and Open Food Facts lookup
- Nutritional info (kcal/100g + allergens) fetched from Open Food Facts and shown on cards
- Expiry date tracking with shelf-life presets (stored accurately, not recalculated)
- Color-coded cards: amber (expiring soon) · rose (expired)
- **Search:** across name, barcode, and category. Debounced, no keystroke lag
- **Filter:** by location · **Sort** by expiry date, date added, or name
- **Tag filtering:** click any tag chip to narrow the list (AND semantics)
- **Stats dashboard:** expiring this week · expiring soon · expired · total units; collapsible charts (by location, by category, 7-day expiry countdown)
- **Expiry timeline view:** toggle from list view to a horizontal timeline showing all items color-coded by status
- **Item photos:** attach a photo to any item; thumbnail shown on card, full image in the detail drawer
- **Item detail drawer:** click any card to open a slide-in drawer with all fields and an inline edit form
- **Quick-add buttons:** from item history one click to pre-fill the form
- **Quantity management:** `- Use one` with low-stock alerts · `+ Add one` · 5-second Undo toast
- **Recurring items:** auto-restock to a configured quantity when depleted to zero
- **Bulk select:** delete or move multiple items at once · Clear all with confirmation guard
- **Drag-and-drop:** drag any card onto a location chip above the grid to move it instantly
- **Keyboard shortcuts:** `N` add item · `/` search · `Esc` close drawer · `?` show shortcut list

### Lists & tracking

- **Shopping list tab:** auto-populated from items below their low-stock threshold; copy or export as plain text
- **Waste log tab:** expired items are logged when deleted, grouped by month, clearable
- **Recipe suggestions:** dismissible banner of TheMealDB recipes when 3+ items are expiring

### Scanner

- **Phone barcode scanner:** scan a QR code on any phone browser, camera auto-detects barcodes
- **Manual expiry date** on the phone review card overrides shelf-life prediction; date and days fields stay in sync

### UI

- **Dark and light mode:** toggle in the header, persisted across sessions
- **Animated background:** subtle hue-shift animation on the background
- **Glass panels:** frosted glass effect on all panels via backdrop-filter
- **Toast notifications:** success, warning, and error toasts replace status messages; auto-dismiss after 3 seconds
- **Responsive layout:** controls stack vertically on narrow screens; 44px touch targets
- **Loading skeletons:** shimmer placeholder cards shown while inventory loads

### Settings & data

- **Settings panel:** default location, default shelf life, expiry warning window (configurable days), per-type notification toggles
- **Custom storage locations:** add locations beyond fridge / freezer / pantry
- **Export** to JSON or CSV · **Import** from JSON or CSV · **Batch barcode import** from a plain-text file (one barcode per line, enriched via Open Food Facts)
- **Email notifications:** optional daily/weekly digest and alerts via Resend or SMTP; pause/snooze controls; HTML templates
- **Optional cloud sync:** bring your own Supabase project; offline-first by default, last-write-wins merge; no mandatory account
- Desktop notifications for expiring, expired, and low-stock items

---

## Download

### One-line install

**Linux & macOS:**

```bash
bash <(curl -fsSL https://aetherassembly.org/install.sh)
```

Auto-detects your distro and architecture, then installs via `apt`, `dnf`, `zypper`, `rpm`, `dmg`, or AppImage fallback.

**Windows** (PowerShell):

```powershell
irm https://aetherassembly.org/install.ps1 | iex
```

Downloads and launches the NSIS installer.

Run the same command again to update.

---

Or grab a specific build from the [Releases](https://github.com/AetherAssembly/Before-Its-Gone/releases) page.

| Platform | Formats |
| --- | --- |
| Linux (x86_64) | AppImage · `.deb` (Debian/Ubuntu/Raspbian) · `.rpm` (Fedora/RHEL/openSUSE) |
| Linux (arm64) | AppImage · `.deb` (Raspberry Pi 4/5) |
| macOS | DMG |
| Windows | NSIS installer · Portable `.exe` |

## Windows

> the portable version may be buggy, and isnt exactly recommended but it does work and is supported. If you find any issues please submit an [Issue](https://github.com/AetherAssembly/Before-Its-Gone/issues/new?template=bug_report.yml) or Fork the `main` branch and submit a [Pull Request](https://github.com/AetherAssembly/Before-Its-Gone/compare) with fixes.

### Install

Run the NSIS installer (`before-its-gone-1.0.0-rc.1-setup.exe`) and follow the prompts, or use the portable `.exe` with no installation required.

### Uninstall

Go to **Settings > Apps** and uninstall `Before Its Gone` from there. The portable version can just be deleted.

## macOS

### Install

Open the `.dmg`, drag `Before Its Gone` into your Applications folder, and launch it from there.

### Uninstall

Drag `Before Its Gone` out of your Applications folder and into the Trash.

> If macOS blocks the app on first launch, go to **System Settings > Privacy & Security** and click **Open Anyway**.

## Linux

> If you would like to use the AppImage easily, you can use [Shelly](https://shellyalpm.com/) (CachyOS), or [GearLever](https://github.com/mijorus/gearlever)

## Fedora / RHEL 9+ / Rocky / Alma

### Install

```bash
sudo dnf install ./before-its-gone-1.0.0-rc.1.x86_64.rpm

# or

sudo dnf install ./before-its-gone-1.0.0-rc.1.arm64.rpm
```

### Uninstall

```bash
sudo dnf remove before-its-gone
```

## OpenSUSE (openSUSE Leap / Tumbleweed)

### Install

```bash
sudo zypper install ./before-its-gone-1.0.0-rc.1-x86_64.rpm

# or 

sudo zypper install ./before-its-gone_1.0.0-rc.1-aarch64.rpm
```

### Uninstall

```bash
sudo zypper remove before-its-gone
```

## Debian / Ubuntu / Raspberry Pi 4/5

### Install

```bash
# All other Debian Distros
sudo apt install ./before-its-gone-1.0.0-rc.1-amd64.deb

# or

# Raspberry Pi 4/5 
sudo apt install ./before-its-gone-1.0.0-rc.1-arm64.deb
```

> Using `apt install ./` (not `dpkg -i`) ensures apt resolves any missing dependencies automatically.

### Uninstall

```bash
sudo apt remove before-its-gone
```

### Raspberry Pi — sandbox warning

On Raspberry Pi OS, Electron may log a warning about the SUID sandbox on first launch. The app still runs. To fix it permanently, choose one of:

**Option 1 — Enable user namespaces system-wide:**

```bash
echo 'kernel.unprivileged_userns_clone = 1' | sudo tee /etc/sysctl.d/00-userns.conf
sudo sysctl -p /etc/sysctl.d/00-userns.conf
```

**Option 2 — Set the SUID bit on the sandbox binary only:**

```bash
sudo chmod 4755 /opt/before-its-gone/chrome-sandbox
```
> The path may vary — find it with `dpkg -L before-its-gone | grep sandbox`.

---

## Development / Install from Source

### Prerequisites

- Node.js >= 22.12.0
- npm >= 10

### Setup

```bash
git clone https://github.com/AetherAssembly/Before-Its-Gone.git
cd Before-Its-Gone
npm install
```

### Run (Electron + Vite dev server)

```bash
npm run dev
```

On Linux the app auto-detects Wayland. To override:

```bash
BIG_LINUX_DISPLAY_BACKEND=x11 npm run dev      # force X11
BIG_LINUX_DISPLAY_BACKEND=wayland npm run dev  # force Wayland
```

### Test

```bash
npm run test           # run unit tests (packages/core)
npm run test:coverage  # run with branch coverage report (target: ≥ 80%)
```

### Build only

```bash
npm run build
```

### Package for distribution

```bash
npm run package:linux        # → release/*.AppImage + release/*.deb + release/*.rpm (x86_64)
npm run package:linux:arm64  # → release/*.AppImage + release/*.deb + release/*.rpm (arm64, cross-compiled)
npm run package:macos        # → release/*.dmg  (run on macOS)
npm run package:windows      # → release/*.exe  (run on Windows)
```

---

## Docs

- [Import & Export Format](docs/import-export-format.md) — JSON, CSV, and barcode-list field reference, examples, and validation rules
- [Email Notifications](docs/email-notifications.md) — Resend and SMTP setup, digest scheduling, pause/snooze
- [Cloud Sync](docs/cloud-sync.md) — Supabase project setup, SQL migration, and sync behaviour

---

## Privacy

By default, all data is stored locally in IndexedDB — no account required. Optional features make additional outbound requests:

- **Barcode lookup:** Open Food Facts receives the barcode value you scan. User-triggered only.
- **Recipe suggestions:** TheMealDB receives the name of an expiring item as an ingredient query. Fires automatically when 3+ items are expiring; dismissible.
- **Email notifications:** your chosen provider (Resend or your own SMTP server) receives item names and expiry data to compose digest emails. Credentials are stored locally in `userData/email-settings.json`.
- **Cloud sync:** your Supabase project receives your full inventory. Opt-in only; disabled by default.

See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for full details.

---

## License

[AGPL-3.0](LICENSE)
