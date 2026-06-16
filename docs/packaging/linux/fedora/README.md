# Fedora / RHEL / CentOS / Rocky Linux / AlmaLinux Packaging

Before It's Gone ships an `.rpm` built by electron-builder on every tagged release.

## Install (Fedora / RHEL 9+ / Rocky / Alma)

Download `before-its-gone-<version>-x86_64.rpm` from the [Releases](https://github.com/AetherAssembly/Before-Its-Gone/releases) page, then:

```bash
sudo dnf install ./before-its-gone-1.1.0-x86_64.rpm
```

## Uninstall

```bash
sudo dnf remove before-its-gone
```

## COPR (Fedora community repo)

Published at [copr.fedorainfracloud.org/coprs/aster1630/before-its-gone](https://copr.fedorainfracloud.org/coprs/aster1630/before-its-gone/). The package source is configured via SCM/Git (rpkg build method) pointing at this repo's `docs/packaging/linux/fedora` subdirectory, so a Copr rebuild re-imports the `.spec` directly — no manual SRPM upload needed.

Users add the repo:

```bash
sudo dnf copr enable aster1630/before-its-gone
sudo dnf install before-its-gone
```

## Supported versions

- Fedora 40 / 41 / 42 — supported
- RHEL 9 / Rocky 9 / AlmaLinux 9 — supported
- RHEL 8 / Rocky 8 / AlmaLinux 8 — may work (older glibc), not officially tested
- CentOS Stream 9 — supported

## Maintainers

- Aster — `aster1630@aetherassembly.org`
