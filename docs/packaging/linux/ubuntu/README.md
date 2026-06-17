# Ubuntu Packaging

Before It's Gone ships a `.deb` package compatible with Ubuntu 22.04 LTS and later.

## Install via the apt repository (recommended)

Before It's Gone hosts its own apt repository, so `apt upgrade` picks up new releases automatically:

```bash

curl -fsSL https://apt.aetherassembly.org/beforeitsgone.gpg.pub | sudo gpg --dearmor -o /usr/share/keyrings/beforeitsgone.gpg

echo "deb [signed-by=/usr/share/keyrings/beforeitsgone.gpg] https://apt.aetherassembly.org stable main" \ | sudo tee /etc/apt/sources.list.d/beforeitsgone.list

sudo apt update && sudo apt install before-its-gone

```

The repo is signed with the `AetherAssembly (apt package signing)` GPG key
(fingerprint `92F8 0D23 A67E 45A2 8777 468A 6857 0D83 9957 FDE7`) — verify it matches before trusting it.

## Manual install

Download `before-its-gone-<version>-amd64.deb` from the [Releases](https://github.com/AetherAssembly/Before-Its-Gone/releases) page, then:

```bash
sudo apt install ./before-its-gone-1.1.1-amd64.deb
```

## Uninstall

```bash
sudo apt remove before-its-gone
```

If you added the apt repo, also remove it:

```bash
sudo rm /etc/apt/sources.list.d/beforeitsgone.list /usr/share/keyrings/beforeitsgone.gpg
```

## Supported versions

- Ubuntu 26.04 LTS (Resolute) — supported
- Ubuntu 24.04 LTS (Noble) — supported
- Ubuntu 22.04 LTS (Jammy) — supported
- Ubuntu 20.04 LTS (Focal) — may work, not officially tested

## Maintainers

- Aster — `aster1630@aetherassembly.org`
