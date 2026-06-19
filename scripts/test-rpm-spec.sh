#!/usr/bin/env bash
# Test the COPR/OBS spec file locally using the electron-builder RPM as the source.
# Builds output into .rpmbuild/ (gitignored) rather than ~/rpmbuild.
#
# Usage:
#   npm run test:rpm-spec             # builds the RPM first if missing
#   npm run test:rpm-spec -- --skip-build  # uses an existing release/*.rpm
set -euo pipefail

SKIP_BUILD=false
for arg in "$@"; do
  [[ "$arg" == "--skip-build" ]] && SKIP_BUILD=true
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION=$(node -e "process.stdout.write(require('${REPO_ROOT}/package.json').version)")
SPEC="${REPO_ROOT}/docs/packaging/linux/fedora/before-its-gone.spec"
RPMBUILD_DIR="${REPO_ROOT}/.rpmbuild"
RELEASE_DIR="${REPO_ROOT}/release"
RPM_X86="before-its-gone-${VERSION}-x86_64.rpm"
RPM_AARCH64="before-its-gone-${VERSION}-aarch64.rpm"

# ── Preflight ──────────────────────────────────────────────────────────────────
if ! command -v rpmbuild &>/dev/null; then
  echo "Error: rpmbuild not found."
  echo "  Fedora/RHEL: sudo dnf install rpm-build"
  echo "  openSUSE:    sudo zypper install rpm-build"
  echo "  Arch:        sudo pacman -S rpm-tools"
  echo "  Debian/Ubuntu: sudo apt install rpm"
  exit 1
fi

# ── Build ──────────────────────────────────────────────────────────────────────
if [[ "$SKIP_BUILD" == false && ! -f "${RELEASE_DIR}/${RPM_X86}" ]]; then
  echo "No RPM found in release/ — building x86_64 RPM..."
  cd "${REPO_ROOT}"
  npm run package:linux:rpm
elif [[ "$SKIP_BUILD" == true ]]; then
  echo "Skipping build (--skip-build)."
fi

if [[ ! -f "${RELEASE_DIR}/${RPM_X86}" ]]; then
  echo "Error: ${RELEASE_DIR}/${RPM_X86} not found after build."
  exit 1
fi

# ── Stage sources ──────────────────────────────────────────────────────────────
# The spec lists two sources (x86_64 and aarch64). For a local smoke-test we
# use the x86_64 build for both — rpmbuild only unpacks the arch it's building
# for, so the aarch64 source is never touched during an x86_64 build.
mkdir -p "${RPMBUILD_DIR}/SOURCES"
cp "${RELEASE_DIR}/${RPM_X86}" "${RPMBUILD_DIR}/SOURCES/${RPM_X86}"
cp "${RELEASE_DIR}/${RPM_X86}" "${RPMBUILD_DIR}/SOURCES/${RPM_AARCH64}"

# ── Run rpmbuild ───────────────────────────────────────────────────────────────
echo ""
echo "Running rpmbuild -bb on ${SPEC##*/}..."
echo "Output: ${RPMBUILD_DIR}/RPMS/"
echo ""

rpmbuild -bb \
  --define "_topdir ${RPMBUILD_DIR}" \
  --define "_sourcedir ${RPMBUILD_DIR}/SOURCES" \
  "${SPEC}"

# ── Report ─────────────────────────────────────────────────────────────────────
echo ""
echo "Built:"
find "${RPMBUILD_DIR}/RPMS" -name "*.rpm" | sort | while read -r f; do
  SIZE=$(du -sh "$f" | cut -f1)
  echo "  ${SIZE}  ${f##*/}"
done
