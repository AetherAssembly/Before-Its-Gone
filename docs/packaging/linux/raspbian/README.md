# Raspberry Pi / Raspberry Pi OS Packaging

Raspberry Pi OS (formerly Raspbian) is Debian-based, so the `.deb` install flow is the same; but the architecture matters.

## Architecture

| Pi model | Architecture |
| - | - |
| Pi 4, Pi 5, Pi 400 | `arm64` (aarch64) — recommended |
| Pi 3 | `arm64` or `armv7l` |
| Pi 2, Pi Zero 2 W | `armv7l` (32-bit) — not tested or compiled |
| Pi 1, Pi Zero | `armv6l` — **not supported** (Electron requires armv7l or newer) |

## Building ARM releases

The release workflow runs on `ubuntu-latest` (x86_64). To produce ARM artifacts, either:

**Option A — GitHub Actions ARM runner (recommended):**

Add an ARM job to `release-linux.yml`:

```yaml
build-linux-arm:
  runs-on: ubuntu-24.04-arm
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 22
    - run: npm ci
    - run: npm run package:linux
```

electron-builder will detect the runner's architecture and produce `arm64` artifacts automatically.

**Option B — QEMU cross-compilation:**

Use the dedicated arm64 script:

```bash
npm run package:linux:arm64
```

Or invoke electron-builder directly:

```bash
npm run build:electron
electron-builder --config apps/electron/electron-builder.linux.yml --linux deb --arm64 --publish never
```

Requires `qemu-user-static` installed on the build host.

## Install on Pi

**Via the apt repository (recommended)** — picks up new releases automatically with `apt upgrade`:

```bash
curl -fsSL https://apt.aetherassembly.org/beforeitsgone.gpg.pub | sudo gpg --dearmor -o /usr/share/keyrings/beforeitsgone.gpg
echo "deb [signed-by=/usr/share/keyrings/beforeitsgone.gpg] https://apt.aetherassembly.org stable main" \
  | sudo tee /etc/apt/sources.list.d/beforeitsgone.list
sudo apt update && sudo apt install before-its-gone-electron
```

The repo is signed with the `AetherAssembly (apt package signing)` GPG key
(fingerprint `92F8 0D23 A67E 45A2 8777 468A 6857 0D83 9957 FDE7`) — verify it matches before trusting it.

**Manual install** — once you have an `arm64` `.deb`:

```bash
sudo apt install ./before-its-gone-1.1.0-arm64.deb
```

## Performance note

Electron on Raspberry Pi is usable on Pi 4/5 but sluggish on Pi 3 and earlier. The app itself is lightweight (IndexedDB + React), so most of the overhead is Electron/Chromium startup, not the app's own logic.

## Maintainers

- Aster — `aster1630@aetherassembly.org`
