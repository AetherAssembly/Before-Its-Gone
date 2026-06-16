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

To let users install and upgrade via `dnf` automatically, publish to [COPR](https://copr.fedorainfracloud.org/):

1. Create a COPR project at `copr.fedorainfracloud.org` (e.g. `aetherassembly/before-its-gone`).
2. Upload the `.spec` from this directory and the source RPM, or point COPR at a Srpm URL.
3. COPR will build it for each enabled Fedora/RHEL release.

Users add the repo:

```bash
sudo dnf copr enable aetherassembly/before-its-gone
sudo dnf install before-its-gone
```

## Supported versions

- Fedora 40 / 41 / 42 — supported
- RHEL 9 / Rocky 9 / AlmaLinux 9 — supported
- RHEL 8 / Rocky 8 / AlmaLinux 8 — may work (older glibc), not officially tested
- CentOS Stream 9 — supported

## Maintainers

- Aster — `aster1630@aetherassembly.org`
