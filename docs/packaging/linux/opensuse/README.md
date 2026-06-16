# openSUSE Packaging

openSUSE uses `.rpm` packages, so the same artifact produced for Fedora/RHEL works here.

## Install (openSUSE Leap / Tumbleweed)

Download `before-its-gone-<version>-x86_64.rpm` from the [Releases](https://github.com/AetherAssembly/Before-Its-Gone/releases) page, then:

```bash
sudo zypper install ./before-its-gone-1.0.1-x86_64.rpm
```

## Uninstall

```bash
sudo zypper remove before-its-gone
```

## OBS (Open Build Service)

To distribute via OBS so users can `zypper dup` automatically:

1. Create an account at [build.opensuse.org](https://build.opensuse.org/).
2. Create a new project (e.g. `home:aetherassembly:before-its-gone`).
3. Copy the `.spec` from `../fedora/before-its-gone.spec` — it is compatible with OBS.
4. Add the source tarball or point to the GitHub release URL in `_service`.
5. OBS will build it for each openSUSE target (Leap 15.x, Tumbleweed).

Users add the repo:

```bash
sudo zypper addrepo https://download.opensuse.org/repositories/home:aetherassembly/openSUSE_Tumbleweed/home:aetherassembly.repo
sudo zypper refresh && sudo zypper install before-its-gone
```

## Supported versions

- openSUSE Tumbleweed — supported (rolling release)
- openSUSE Leap 15.6 — supported

## Maintainers

- Aster — `aster1630@aetherassembly.org`
