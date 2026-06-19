# Fedora / RHEL / CentOS / Rocky Linux / AlmaLinux Packaging

Before It's Gone ships an `.rpm` built by electron-builder on every tagged release.

## COPR (Fedora community repo)

Published at [copr.fedorainfracloud.org/coprs/aster1630/before-its-gone](https://copr.fedorainfracloud.org/coprs/aster1630/before-its-gone/). The package source is configured via SCM/Git (rpkg build method) pointing at this repo's `docs/packaging/linux/fedora` subdirectory, so a Copr rebuild re-imports the `.spec` directly — no manual SRPM upload needed.

Users add the repo:

```bash
sudo dnf copr enable aster1630/before-its-gone
sudo dnf install before-its-gone
```

## Manual Install (Fedora / Mageia / CentOS)

Download `before-its-gone-<version>-x86_64.rpm` from the [Releases](https://github.com/AetherAssembly/Before-Its-Gone/releases) page, then:

```bash
sudo dnf install ./before-its-gone-1.1.2-x86_64.rpm
```

## Uninstall

```bash
sudo dnf remove before-its-gone
```

## Supported versions

Tested against Fedora 42 and later, CentOS Stream 9/10, and Mageia 9. Fedora 40/41 and CentOS Stream 8 should work but are not officially tested.

## Maintainers

- Aster — `aster1630@aetherassembly.org`
