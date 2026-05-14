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

---

## Features

- Barcode scanning with local profile storage and Open Food Facts lookup
- Expiry date tracking with shelf-life presets
- Color-coded cards: amber (expiring soon) · rose (expired)
- Desktop notifications for expiring and low-stock items
- **Search** across name, barcode, and category
- **Filter** by location (fridge / freezer / pantry)
- **Sort** by expiry date, date added, or name
- **Stats dashboard** — items expiring this week, expired count, total units
- **Quick-add buttons** from your item history — one click to pre-fill the form
- **Categories** — tag items with e.g. "dairy", "meat", "snacks"
- **Quantity depletion** — "Use one" button with low-stock alerts
- **Export** to JSON or CSV · **Import** from JSON backup
- **Clear all** with confirmation guard

---

## Download

Get the latest release from the [Releases](https://github.com/AetherAssembly/Before-Its-Gone/releases) page.

| Platform | Formats |
| --- | --- |
| Linux (x86_64) | AppImage · `.deb` (Debian/Ubuntu/Raspbian) · `.rpm` (Fedora/RHEL/openSUSE) |
| Linux (arm64) | AppImage · `.deb` (Raspberry Pi 4/5) |
| macOS | DMG |
| Windows | NSIS installer · Portable `.exe` |

## Arch Linux (AUR)

### Install

```bash
yay -S before-its-gone      # build from source
yay -S before-its-gone-bin  # pre-built AppImage
```

### Uninstall

```bash
yay -R before-its-gone
yay -R before-its-gone-bin
```

### Flatpak / Snap

Coming soon

## (Fedora / RHEL 9+ / Rocky / Alma)

### Install

```bash
sudo dnf install ./before-its-gone-0.5.0.x86_64.rpm
```

### Uninstall

```bash
sudo dnf remove before-its-gone
```

## OpenSUSE (openSUSE Leap / Tumbleweed)

### Install

```bash
sudo zypper install ./before-its-gone-0.5.0.x86_64.rpm
```

### Uninstall

```bash
sudo zypper remove before-its-gone
```

## Debian / Ubuntu

### Install

```bash
sudo apt install ./before-its-gone_0.5.0_amd64.deb
```

> Using `apt install ./` (not `dpkg -i`) ensures apt resolves any missing dependencies automatically.

### Uninstall

```bash
sudo apt remove before-its-gone
```

## Raspberry Pi 4/5

### Install

```bash
sudo apt install ./before-its-gone_0.5.0_amd64.deb
```

### Uninstall

```bash
sudo apt remove before-its-gone
```

---

## Development

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
npm run package:linux    # → release/*.AppImage + release/*.deb + release/*.rpm
npm run package:macos    # → release/*.dmg  (run on macOS)
npm run package:windows  # → release/*.exe  (run on Windows)
```

---

## Privacy

All data is stored locally in IndexedDB. Nothing is sent to any server except optional barcode lookups to [Open Food Facts](https://world.openfoodfacts.org/), which you trigger explicitly. See [PRIVACY_POLICY.md](PRIVACY_POLICY.md).

---

## License

[AGPL-3.0](LICENSE)
