# Debian / Ubuntu / Raspberry Pi Packaging

Before It's Gone ships a `.deb` package built by electron-builder on every tagged release.

## Install via the apt repository (recommended)

Before It's Gone hosts its own apt repository, so `apt upgrade` picks up new releases automatically — no need to manually re-download a `.deb` for every version:

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
sudo apt install ./before-its-gone-1.3.1-amd64.deb

# or 

sudo apt install ./before-its-gone-1.3.1-arm64.deb

```

Using `apt install ./` (not `dpkg -i`) ensures apt resolves any missing dependencies automatically.

## Uninstall

```bash
sudo apt remove before-its-gone
```

If you added the apt repo, also remove it:

```bash
sudo rm /etc/apt/sources.list.d/beforeitsgone.list /usr/share/keyrings/beforeitsgone.gpg
```

## Supported versions

Tested against Debian 13 (Trixie). Debian 12 (Bookworm) should work but is not officially tested.

## Maintainers

- Aster — `aster1630@aetherassembly.org`

## Beta / pre-release builds

Beta builds are published to a separate `beta` distribution in the same apt repo. To opt in:

```bash
echo "deb [signed-by=/usr/share/keyrings/beforeitsgone.gpg] https://apt.aetherassembly.org beta main" \
  | sudo tee /etc/apt/sources.list.d/beforeitsgone-beta.list

sudo apt update && sudo apt install before-its-gone-beta
```

The beta package is named `before-its-gone-beta` so it can coexist alongside stable — installing one won't remove the other, though the `Conflicts` field prevents running both at the same time. To switch back to stable, remove `before-its-gone-beta` and install `before-its-gone`.

The in-app updater on beta builds automatically checks the `beta` update channel and will offer newer betas as they are published.
