## Before It's Gone: vX.Y.Z

### What's new

-

### Bug fixes

-

---

### Downloads

| Platform | Format | SHA256 |
|---|---|---|
| Linux (x64) | [AppImage](#) | `APPIMAGE_X64_SHA256` |
| Linux (x64) | [.deb](#) | `DEB_X64_SHA256` |
| Linux (x64) | [.rpm](#) | `RPM_X64_SHA256` |
| Linux (arm64) | [AppImage](#) | `APPIMAGE_ARM64_SHA256` |
| Linux (arm64) | [.deb](#) | `DEB_ARM64_SHA256` |
| Linux (arm64) | [.rpm](#) | `RPM_ARM64_SHA256` |
| macOS | [DMG](#) | `DMG_SHA256` |
| Windows | [Installer (.exe)](#) | `EXE_SHA256` |
| Windows | [Portable (.exe)](#) | `PORTABLE_SHA256` |

#### Verify a download

```bash
sha256sum "before-its-gone-X.Y.Z-x64.AppImage"
```

---

### Linux notes

The app auto-detects Wayland. To override:

```bash
BIG_LINUX_DISPLAY_BACKEND=wayland ./before-its-gone-X.Y.Z-x64.AppImage
BIG_LINUX_DISPLAY_BACKEND=x11    ./before-its-gone-X.Y.Z-x64.AppImage
```

> **deb/rpm updates:** the app will notify you when a new version is available but cannot update itself automatically. Download the new package from this page and run the usual upgrade command; no uninstall needed:

- **Debian/Ubuntu:** `sudo apt install ./before-its-gone_X.Y.Z_amd64.deb`
- **Fedora/RHEL:** `sudo dnf upgrade ./before-its-gone-X.Y.Z.x86_64.rpm`
- **openSUSE:** `sudo zypper update ./before-its-gone-X.Y.Z-x86_64.rpm`

### macOS notes

If macOS blocks the app on first launch, right-click → Open to bypass Gatekeeper.

### Windows notes

If SmartScreen warns on the installer, click **More info → Run anyway**. The app is not yet code-signed.

---

### Full changelog

<!-- https://github.com/AetherAssembly/Before-Its-Gone/compare/vPREV...vX.Y.Z -->
