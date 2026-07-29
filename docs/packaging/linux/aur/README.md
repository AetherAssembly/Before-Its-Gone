# AUR Packaging

Before It's Gone is not yet published on the AUR. Each GitHub release automatically generates a `PKGBUILD` (with the correct version, arch list, and checksums already filled in) and attaches it to the release assets — look for the asset labeled `PKGBUILD` on the [Releases](https://github.com/AetherAssembly/Before-Its-Gone/releases) page.

## Install manually with makepkg

```bash
# grab the generated PKGBUILD from the latest release
gh release download --pattern 'PKGBUILD*' --output PKGBUILD

makepkg -si
```

Or download it directly from the browser (the asset is named `PKGBUILD.release` but labeled `PKGBUILD`, you will have to rename it). Then run `makepkg -si` in the same directory.

## Supported versions

Tested against current CachyOS (rolling release). Any up-to-date Arch install should work; no minimum version applies.

## Maintainers

- Aster — `support@aetherassembly.org`

## Beta / pre-release builds

Beta releases do **not** generate an automatic PKGBUILD — the CI skips that step for `vX.X.X-beta.X` tags. To install a beta manually, download the `.AppImage` from the pre-release on the [Releases](https://github.com/AetherAssembly/Before-Its-Gone/releases) page and run it directly, or write your own `PKGBUILD` pointing at the beta assets.

The in-app updater on beta builds automatically checks the `beta` update channel and will offer newer betas as they are published.
