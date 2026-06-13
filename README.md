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
[![Wiki](https://img.shields.io/badge/wiki-documentation-555555?logo=github&logoColor=white)](https://aetherassembly.org/wiki/before-its-gone)

Offline-first desktop app, no account required; all data stays on your machine.

---

## Features

Scan barcodes with your phone, track expiry dates, and get notified before things go off. Includes a shopping list, waste log, recipe suggestions, optional email digests, and opt-in Supabase cloud sync. Dark/light mode, drag-and-drop, keyboard shortcuts, and a phone barcode scanner that works on any browser.

Everything runs locally; the only outbound requests are Open Food Facts (barcode lookup), TheMealDB (recipe suggestions), and your own Supabase project if you enable sync.

---

## Download

**Linux & macOS:**

```bash
bash <(curl -fsSL https://aetherassembly.org/install.sh)
```

**Windows** (PowerShell):

```powershell
irm https://aetherassembly.org/install.ps1 | iex
```

Auto-detects your distro, architecture, and package manager. Run the same command again to update.

Or grab a specific build from the [Releases](https://github.com/AetherAssembly/Before-Its-Gone/releases) page.

| Platform | Formats |
| --- | --- |
| Linux (x86_64) | AppImage · `.deb` · `.rpm` · `PKGBUILD` (Arch) |
| Linux (arm64) | AppImage · `.deb` (Raspberry Pi 4/5) |
| macOS | DMG |
| Windows | NSIS installer · Portable `.exe` |

### Platform notes

**macOS:** if the app is blocked on first launch, go to **System Settings > Privacy & Security** and click **Open Anyway**.

**Windows:** if SmartScreen warns on the installer, click **More info → Run anyway**. The app is not yet code-signed.

**Linux (Wayland/X11):** the app auto-detects your session. To override:

```bash
BIG_LINUX_DISPLAY_BACKEND=wayland npm run dev
BIG_LINUX_DISPLAY_BACKEND=x11    npm run dev
```

**Raspberry Pi:** Electron may log a SUID sandbox warning on first launch. The app still runs; see the [wiki](https://aetherassembly.org/wiki/before-its-gone/installation) to fix it permanently.

---

## npm Packages

The core business logic and UI component are published to GitHub Packages and available for use in your own projects.

```bash
# configure your npm client to use the GitHub Packages registry for @aetherAssembly
echo "@aetherAssembly:registry=https://npm.pkg.github.com" >> .npmrc

npm install @aetherAssembly/core
npm install @aetherAssembly/ui
```

| Package | Description |
| --- | --- |
| [`@aetherAssembly/core`](https://github.com/AetherAssembly/Before-Its-Gone/pkgs/npm/core) | Inventory logic, IndexedDB storage, expiry calculations, import/export, email templates |
| [`@aetherAssembly/ui`](https://github.com/AetherAssembly/Before-Its-Gone/pkgs/npm/ui) | `InventoryCard` React component |

> **License notice:** both packages are published under [AGPL-3.0-only](LICENSE). If you use them in your own project, including as a network service, your project must also be released under AGPL-3.0 and its source made available to users. If that doesn't work for you, contact us at [support@aetherassembly.org](mailto:support@aetherassembly.org) to discuss a commercial licence.

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

### Commands

```bash
npm run dev              # Electron app with hot reload
npm run dev:web          # Web only at localhost:5173
npm run build            # Full build
npm run test             # Unit tests (packages/core)
npm run test:coverage    # With branch coverage report (target: ≥ 80%)
npm run package:linux        # AppImage + .deb + .rpm (x86_64)
npm run package:linux:arm64  # AppImage + .deb + .rpm (arm64, cross-compiled)
npm run package:macos        # .dmg  (run on macOS)
npm run package:windows      # .exe  (run on Windows)
```

---

## Docs

- [Architecture](docs/architecture.md): monorepo layout, storage map, IPC channels, build pipeline
- [Import & Export Format](docs/import-export-format.md): JSON, CSV, and barcode-list field reference
- [Email Notifications](docs/email-notifications.md): Resend and SMTP setup, digest scheduling, pause/snooze
- [Cloud Sync](docs/cloud-sync.md): Supabase project setup, SQL migration, and sync behaviour
- [API Setup](docs/api-setup.md): Open Food Facts and TheMealDB integration details
- [SMTP Config](docs/smtp-config.md): SMTP provider guide

---

## Privacy

All data is stored locally in IndexedDB by default. Optional features make outbound requests to Open Food Facts (barcode lookup), TheMealDB (recipe suggestions), your chosen email provider (digest emails), and your own Supabase project (cloud sync). See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for full details.

---

## License

[AGPL-3.0](LICENSE)
