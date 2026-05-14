## Before It's Gone — vX.Y.Z

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

#### Arch Linux (AUR)

```bash
yay -S before-its-gone      # build from source
yay -S before-its-gone-bin  # pre-built AppImage
```

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

### macOS notes

If macOS blocks the app on first launch, right-click → Open to bypass Gatekeeper.

### Windows notes

If SmartScreen warns on the installer, click **More info → Run anyway**. The app is not yet code-signed.

---

### Full changelog

<!-- https://github.com/AetherAssembly/Before-Its-Gone/compare/vPREV...vX.Y.Z -->
