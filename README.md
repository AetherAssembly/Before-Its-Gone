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

Offline-first desktop app no account required, all data stays on your machine.

---

## Features

- Barcode scanning with local profile storage and Open Food Facts lookup
- Expiry date tracking with shelf-life presets (stored accurately, not recalculated)
- Color-coded cards: amber (expiring soon) · rose (expired)
- Desktop notifications for expiring and low-stock items
- **Search** across name, barcode, and category — debounced, no keystroke lag
- **Filter** by location (fridge / freezer / pantry)
- **Sort** by expiry date, date added, or name
- **Stats dashboard:** items expiring this week, expired count, total units
- **Quick-add buttons** from your item history, one click to pre-fill the form
- **Categories & tags:** tag items with e.g. "dairy", "meat", "snacks"
- **Quantity management:** `− Use one` with low-stock alerts · `+ Add one` to restock in one tap
- **Undo "Use one":** 5-second slide-in toast lets you reverse accidental taps
- **Export** to JSON or CSV · **Import** from JSON or CSV
- **Bulk select:** delete or move multiple items at once
- **Clear all:** with confirmation guard

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

Run the NSIS installer (`before-its-gone-0.7.1-setup.exe`) and follow the prompts, or use the portable `.exe` with no installation required.

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
sudo dnf install ./before-its-gone-0.7.1.x86_64.rpm

# or

sudo dnf install ./before-its-gone-0.7.1.arm64.rpm
```

### Uninstall

```bash
sudo dnf remove before-its-gone
```

## OpenSUSE (openSUSE Leap / Tumbleweed)

### Install

```bash
sudo zypper install ./before-its-gone-0.7.1-x86_64.rpm

# or 

sudo zypper install ./before-its-gone_0.7.1-aarch64.rpm
```

### Uninstall

```bash
sudo zypper remove before-its-gone
```

## Debian / Ubuntu / Raspberry Pi 4/5

### Install

```bash
# All other Debian Distros
sudo apt install ./before-its-gone-0.7.1-amd64.deb

# or

# Raspberry Pi 4/5 
sudo apt install ./before-its-gone-0.7.1-arm64.deb
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

- [Import & Export Format](docs/import-export-format.md) — JSON and CSV field reference, examples, and validation rules

---

## Privacy

All data is stored locally in IndexedDB. Nothing is sent to any server except optional barcode lookups to [Open Food Facts](https://world.openfoodfacts.org/), which you trigger explicitly. See [PRIVACY_POLICY.md](PRIVACY_POLICY.md).

---

## License

[AGPL-3.0](LICENSE)
