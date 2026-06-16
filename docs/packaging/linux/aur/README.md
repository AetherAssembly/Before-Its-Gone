# AUR Packaging

Before It's Gone is not yet published on the AUR. Each GitHub release automatically generates a `PKGBUILD` (with the correct version, arch list, and checksums already filled in) and attaches it to the release assets — look for the asset labeled `PKGBUILD` on the [Releases](https://github.com/AetherAssembly/Before-Its-Gone/releases) page.

## Install manually with makepkg

```bash
# grab the generated PKGBUILD from the latest release
gh release download --pattern 'PKGBUILD*' --output PKGBUILD

makepkg -si
```

Or download it directly from the browser (the asset is named `PKGBUILD.release` but labeled `PKGBUILD`, you will have to rename it). Then run `makepkg -si` in the same directory.

This builds the AppImage-based package for your architecture (x86_64, or arm64 depending on what `uname -m` reports and what was published in that release).

## Maintainers

- Aster — `aster1630@aetherassembly.org`
