# openSUSE Packaging

openSUSE uses `.rpm` packages, so the same artifact produced for Fedora/RHEL works here.

## Install (openSUSE Leap / Tumbleweed)

Download `before-its-gone-<version>-x86_64.rpm` from the [Releases](https://github.com/AetherAssembly/Before-Its-Gone/releases) page, then:

```bash
sudo zypper install ./before-its-gone-1.1.0-x86_64.rpm
```

## Uninstall

```bash
sudo zypper remove before-its-gone
```

## OBS (Open Build Service)

Published at [build.opensuse.org/package/show/home:aster1630/before-its-gone](https://build.opensuse.org/package/show/home:aster1630/before-its-gone).

```bash
sudo zypper addrepo https://download.opensuse.org/repositories/home:aster1630/openSUSE_Tumbleweed/home:aster1630.repo
sudo zypper refresh && sudo zypper install before-its-gone
```

## Supported versions

- openSUSE Tumbleweed — supported (rolling release)
- openSUSE Leap 16.0 — supported
- openSUSE Leap 15.6 — supported

## Maintainers

- Aster — `aster1630@aetherassembly.org`
