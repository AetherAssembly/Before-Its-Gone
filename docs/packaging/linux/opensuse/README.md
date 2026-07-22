# openSUSE Packaging

openSUSE uses `.rpm` packages, so the same artifact produced for Fedora/RHEL works here.

## Open Build Service (Recommended)

Published at [build.opensuse.org/package/show/home:aster1630/before-its-gone](https://build.opensuse.org/package/show/home:aster1630/before-its-gone).

```bash

sudo zypper addrepo https://download.opensuse.org/repositories/home:aster1630/openSUSE_Tumbleweed/home:aster1630.repo

sudo zypper refresh && sudo zypper install before-its-gone

```

## Manual Install (openSUSE Leap / Tumbleweed)

Download `before-its-gone-<version>-x86_64.rpm` from the [Releases](https://github.com/AetherAssembly/Before-Its-Gone/releases) page, then:

```bash
sudo zypper install ./before-its-gone-1.3.2-beta.1-x86_64.rpm

# or

sudo zypper install ./before-its-gone-1.3.1-arm64.rpm

```

## Uninstall

```bash
sudo zypper remove before-its-gone
```

## Supported versions

Tested against openSUSE Tumbleweed (rolling) and Leap 15.6 / 16.0. Older Leap versions may work but are not officially tested.

## Maintainers

- Aster — `aster1630@aetherassembly.org`

## Beta / pre-release builds

Beta builds are published to a separate OBS project. To add it:

```bash
sudo zypper addrepo https://download.opensuse.org/repositories/home:aster1630:before-its-gone-beta/openSUSE_Tumbleweed/home:aster1630:before-its-gone-beta.repo
sudo zypper refresh && sudo zypper install before-its-gone
```

The beta spec and `_service` file live at `docs/packaging/linux/fedora/beta/` in the repo. The `_service` file pins the full beta release URL; update both paths on each new beta.

The in-app updater on beta builds automatically checks the `beta` update channel and will offer newer betas as they are published.
