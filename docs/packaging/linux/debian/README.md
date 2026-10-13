# Debian / Ubuntu / Raspberry Pi Packaging

Before It's Gone provides Debian packages for amd64 and arm64.

## Installation

#### Stable APT repository (recommended)

The signing-key fingerprint must be `32B72F22E77E21F510B31849A7B44812A39EEB9C`. Both applications use this key. The repository supports **amd64** and **arm64**, including 64-bit Raspberry Pi OS; 32-bit armhf is not supported.

Only stable releases are published to APT. New stable releases may take up to 12 hours to appear. Beta releases are available directly from GitHub; there is no beta APT channel.

```sh
sudo apt update
sudo apt install ca-certificates curl gnupg
sudo install -d -m 0755 /etc/apt/keyrings
curl -fsSL https://apt.aetherassembly.org/before-its-gone/apt-repo-public.asc -o /tmp/aetherassembly-apt-public.asc
gpg --show-keys --with-fingerprint /tmp/aetherassembly-apt-public.asc

# Confirm the fingerprint below before continuing.
sudo install -m 0644 /tmp/aetherassembly-apt-public.asc /etc/apt/keyrings/aetherassembly.asc
echo "deb [arch=amd64,arm64 signed-by=/etc/apt/keyrings/aetherassembly.asc] https://apt.aetherassembly.org/before-its-gone stable main" \
  | sudo tee /etc/apt/sources.list.d/before-its-gone.list >/dev/null
rm /tmp/aetherassembly-apt-public.asc
sudo apt update
sudo apt install before-its-gone
```

To update later:

```sh
sudo apt update
sudo apt install --only-upgrade before-its-gone
```

If you previously configured the old AetherAssembly repository, remove its obsolete source entry (including any beta entry) before adding the new one. Do not remove other applications' source entries.

#### Manual Debian package

Download the matching stable `.deb` from GitHub Releases, then install it with:

```sh
sudo apt install ./before-its-gone-<version>-amd64.deb
# For ARM64, use the asset ending in arm64.deb instead.
```

Using `apt install ./` resolves missing dependencies automatically.

## Uninstall

```sh
sudo apt remove before-its-gone
sudo rm -f /etc/apt/sources.list.d/before-its-gone.list
sudo apt update
```

Keep `/etc/apt/keyrings/aetherassembly.asc` if another configured AetherAssembly repository still uses it. Remove the key only when no remaining source refers to it.

## Supported versions

Tested against Debian 13 (Trixie). Debian 12 (Bookworm) should work but is not officially tested.

## Maintainers

- AetherAssembly — `apt@aetherassembly.org`

## Beta / prerelease builds

Download beta Debian packages directly from [GitHub Releases](https://github.com/AetherAssembly/Before-Its-Gone/releases). Beta packages use the name `before-its-gone-beta`; they are not distributed through APT.
