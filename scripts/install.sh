#!/usr/bin/env bash
# Before It's Gone — installer / updater
# Usage: curl -fsSL https://aetherassembly.org/install.sh | bash
set -euo pipefail

REPO="AetherAssembly/Before-Its-Gone"
API="https://api.github.com/repos/${REPO}/releases/latest"
RELEASES_URL="https://github.com/${REPO}/releases"

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
info()    { printf "${CYAN}==> ${BOLD}%s${RESET}\n" "$*"; }
success() { printf "${GREEN}✓${RESET} %s\n" "$*"; }
die()     { printf "${RED}✗${RESET} %s\n" "$*" >&2; exit 1; }

OS="$(uname -s)"
ARCH="$(uname -m)"

[[ "$OS" != "Linux" && "$OS" != "Darwin" ]] && die "Unsupported OS: $OS. Only Linux and macOS are supported."

info "Checking latest release..."
API_JSON="$(curl -fsSL "$API")" || die "Failed to reach GitHub. Check your internet connection."

VERSION="$(printf '%s' "$API_JSON" | grep '"tag_name"' | sed 's/.*"tag_name": *"\(.*\)".*/\1/' | head -1)"
[[ -z "$VERSION" ]] && die "Could not determine latest version."

info "Latest version: $VERSION"

pick_asset() {
  printf '%s' "$API_JSON" \
    | grep '"browser_download_url"' \
    | sed 's/.*"browser_download_url": *"\(.*\)".*/\1/' \
    | grep -i "$1" \
    | head -1
}

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# ── macOS ──────────────────────────────────────────────────────────────────────
if [[ "$OS" == "Darwin" ]]; then
  URL="$(pick_asset '\.dmg$')"
  [[ -z "$URL" ]] && die "No macOS DMG found for $VERSION. Download manually: $RELEASES_URL"

  FILE="$WORK/$(basename "$URL")"
  info "Downloading $(basename "$URL")..."
  curl -fsSL --progress-bar "$URL" -o "$FILE"

  info "Mounting DMG..."
  MOUNT_OUT="$(hdiutil attach "$FILE" -nobrowse -noautoopen -readonly)"
  MOUNT_POINT="$(printf '%s' "$MOUNT_OUT" | grep -oE '/Volumes/[^\t]+' | tail -1)"

  APP="$(ls "$MOUNT_POINT" | grep '\.app$' | head -1)"
  [[ -z "$APP" ]] && { hdiutil detach "$MOUNT_POINT" -quiet; die "No .app found inside DMG."; }

  info "Installing to /Applications..."
  [[ -d "/Applications/$APP" ]] && rm -rf "/Applications/$APP"
  cp -R "$MOUNT_POINT/$APP" /Applications/
  hdiutil detach "$MOUNT_POINT" -quiet

  # Strip the quarantine attribute — without this, macOS blocks launch with
  # "app is damaged" because the DMG was downloaded from the internet.
  xattr -cr "/Applications/$APP" 2>/dev/null || true

  success "Before It's Gone $VERSION installed → /Applications/$APP"
  exit 0
fi

# ── Linux ──────────────────────────────────────────────────────────────────────
case "$ARCH" in
  x86_64)        DEB_ARCH="amd64";  RPM_ARCH="x86_64";  AI_ARCH="x86_64" ;;
  aarch64|arm64) DEB_ARCH="arm64";  RPM_ARCH="aarch64"; AI_ARCH="arm64"  ;;
  *) die "Unsupported architecture: $ARCH" ;;
esac

download() {
  local url="$1" dest="$2"
  info "Downloading $(basename "$url")..."
  curl -fsSL --progress-bar "$url" -o "$dest"
}

if command -v apt &>/dev/null; then
  if [[ ! -f /etc/apt/sources.list.d/beforeitsgone.list ]]; then
    info "Adding apt.aetherassembly.org repo (sudo required)..."
    curl -fsSL https://apt.aetherassembly.org/beforeitsgone.gpg.pub | sudo gpg --dearmor -o /usr/share/keyrings/beforeitsgone.gpg
    echo "deb [signed-by=/usr/share/keyrings/beforeitsgone.gpg] https://apt.aetherassembly.org stable main" \
      | sudo tee /etc/apt/sources.list.d/beforeitsgone.list >/dev/null
  fi
  info "Installing with apt (sudo required)..."
  sudo apt update
  sudo apt install -y before-its-gone-electron

elif command -v dnf &>/dev/null; then
  if dnf copr enable -y aster1630/before-its-gone &>/dev/null && sudo dnf install -y before-its-gone; then
    :
  else
    URL="$(pick_asset "\-${RPM_ARCH}\.rpm$")"
    [[ -z "$URL" ]] && die "No .rpm found for $RPM_ARCH in $VERSION. Download manually: $RELEASES_URL"
    FILE="$WORK/$(basename "$URL")"
    download "$URL" "$FILE"
    info "Installing with dnf (sudo required)..."
    sudo dnf install -y "$FILE"
  fi

elif command -v zypper &>/dev/null; then
  if zypper lr 2>/dev/null | grep -q 'home:aster1630' \
    || sudo zypper --non-interactive addrepo https://download.opensuse.org/repositories/home:aster1630/openSUSE_Tumbleweed/home:aster1630.repo &>/dev/null; then
    sudo zypper --non-interactive refresh &>/dev/null || true
  fi
  if zypper lr 2>/dev/null | grep -q 'home:aster1630' && sudo zypper --non-interactive install before-its-gone; then
    :
  else
    URL="$(pick_asset "\-${RPM_ARCH}\.rpm$")"
    [[ -z "$URL" ]] && die "No .rpm found for $RPM_ARCH in $VERSION. Download manually: $RELEASES_URL"
    FILE="$WORK/$(basename "$URL")"
    download "$URL" "$FILE"
    info "Installing with zypper (sudo required)..."
    sudo zypper --non-interactive install "$FILE"
  fi

elif command -v rpm &>/dev/null && ! command -v pacman &>/dev/null; then
  URL="$(pick_asset "\-${RPM_ARCH}\.rpm$")"
  [[ -z "$URL" ]] && die "No .rpm found for $RPM_ARCH in $VERSION. Download manually: $RELEASES_URL"
  FILE="$WORK/$(basename "$URL")"
  download "$URL" "$FILE"
  info "Installing with rpm (sudo required)..."
  sudo rpm -Uvh "$FILE"

else
  # AppImage fallback — no supported package manager found
  URL="$(pick_asset "\-${AI_ARCH}\.AppImage$")"
  [[ -z "$URL" ]] && die "No AppImage found for $AI_ARCH in $VERSION. Download manually: $RELEASES_URL"
  FILE="$WORK/$(basename "$URL")"
  download "$URL" "$FILE"

  INSTALL_DIR="$HOME/.local/bin"
  DEST="$INSTALL_DIR/before-its-gone.AppImage"
  mkdir -p "$INSTALL_DIR"
  mv "$FILE" "$DEST"
  chmod +x "$DEST"

  # Desktop entry for app launchers
  DESKTOP_DIR="$HOME/.local/share/applications"
  mkdir -p "$DESKTOP_DIR"
  cat > "$DESKTOP_DIR/before-its-gone.desktop" <<EOF
[Desktop Entry]
Name=Before It's Gone
Comment=Offline inventory tracker for fridge and pantry items
Exec=$DEST %U
Icon=before-its-gone
Terminal=false
Type=Application
Categories=Utility;
EOF

  success "AppImage installed → $DEST"

  if [[ ":$PATH:" != *":${INSTALL_DIR}:"* ]]; then
    printf "\n  To run from the terminal, add this to your shell profile (~/.bashrc, ~/.zshrc, etc.):\n"
    printf '  export PATH="$HOME/.local/bin:$PATH"\n\n'
  fi
  exit 0
fi

success "Before It's Gone $VERSION installed successfully"
