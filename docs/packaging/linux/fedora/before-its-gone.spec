%global debug_package %{nil}
# Prevent rpmbuild from generating new build-id symlinks for the Electron/Chromium
# ELF binaries. The upstream RPM carries its own build-id entries; we strip those
# from BUILDROOT in %%install so they don't trigger "unpackaged files" errors.
%global _build_id_links none

# The app under /opt is a self-contained Electron/Chromium bundle, same as
# upstream ships it. Don't let rpmbuild scan its private .so files for
# auto-Requires/Provides -- that produces noisy and sometimes wrong deps.
%global __requires_exclude_from ^/opt/Before-Its-Gone/.*$
%global __provides_exclude_from ^/opt/Before-Its-Gone/.*$

Name:           before-its-gone
Version:        1.3.0
Release:        1%{?dist}
Summary:        Track what's in your fridge, freezer, and pantry before it expires

License:        AGPL-3.0-only
URL:            https://github.com/AetherAssembly/Before-Its-Gone
# electron-builder's rpm filenames already use rpm's own arch names
# (x86_64 / aarch64). Both are listed as separate static Sources (rather
# than templated on %%{_arch}) because Copr's rpkg/dist-git lookaside cache
# fetches sources once at import time, not per build-chroot -- a single
# %%{_arch}-templated Source0 only ever caches the importer's own arch and
# breaks every other chroot's build.
Source0:        https://github.com/AetherAssembly/Before-Its-Gone/releases/download/v%{version}/before-its-gone-%{version}-x86_64.rpm
Source1:        https://github.com/AetherAssembly/Before-Its-Gone/releases/download/v%{version}/before-its-gone-%{version}-aarch64.rpm

Requires:       hicolor-icon-theme
BuildRequires:  hicolor-icon-theme
ExclusiveArch:  x86_64 aarch64

%description
Before It's Gone is an offline-first food expiry tracker. Track what's in
your fridge, freezer, and pantry; get notified before things go off; keep
a shopping list and waste log; and get recipe suggestions for what's about
to expire. All data stays on-device unless you opt in to cloud sync.

This package repackages the upstream .rpm release built by electron-builder,
since OBS/COPR build chroots have no network access and can't fetch the
prebuilt Electron/Chromium binaries needed to build from source.

%prep
%ifarch x86_64
rpm2cpio %{SOURCE0} | cpio -idm
%endif
%ifarch aarch64
rpm2cpio %{SOURCE1} | cpio -idm
%endif

%build
# Nothing to build; the upstream .rpm's payload is extracted in %%prep and
# installed as-is in %%install.

%install
mkdir -p %{buildroot}
cp -a opt %{buildroot}/
cp -a usr %{buildroot}/
rm -rf %{buildroot}/usr/lib/.build-id

%files
/opt/Before-Its-Gone
/usr/share/applications/%{name}.desktop
/usr/share/icons/hicolor/*/apps/%{name}.png

%changelog
* Mon Jul 07 2026 Aster <support@aetherassembly.org> - 1.3.1-1
- Replace placeholder app icon with the BIG carrot rocket logo across all
  targets: Electron asset, PWA icons (192px, 512px), and Linux release bundles.


* Mon Jul 06 2026 Aster <support@aetherassembly.org> - 1.3.0-1
- Add virtual scrolling to the inventory list so only visible cards are
  rendered, reducing layout jank on large inventories and lower-end hardware.
- Add Husky + lint-staged pre-commit hook; ESLint runs automatically on staged
  .ts/.tsx files before every commit. Run npm install once to activate.
- Extend unit test suite to 102 tests covering calculateExpiryStatus boundary
  conditions, normalizeDate format variants, getShoppingList threshold logic,
  and getFrequentItems sorting and limit behaviour.
- Add docs/data-model.md: dedicated InventoryItem field reference linked from
  the README Docs section.
- Add docs/demo-data.json: 15-item sample dataset covering all three locations
  and all three expiry statuses, importable via Data -> Import JSON.
- Untrack packages/core/coverage/ from git and add an explicit .gitignore entry.

* Thu Jun 19 2026 Aster <support@aetherassembly.org> - 1.2.1-1
- Rename workspace packages from `@before-its-gone/core` and `@before-its-gone/ui`
  to `@aetherAssembly/big-core` and `@aetherAssembly/big-ui` so the npm scope
  matches the AetherAssembly GitHub org and publishing to GitHub Packages succeeds.
- Add `files` field to `@aetherAssembly/big-core` package.json so coverage
  reports, source files, and config files are excluded from the published tarball.
- Inline `StorageAdapter` interface and `LocalStorageAdapter` class directly into
  `packages/core/src/storage.ts`, removing the fragile symlinked `@aetherAssembly/core`
  cross-repo dependency that caused `tsc --build` to fail on cold/clean builds.

* Fri Jun 19 2026 Aster <support@aetherassembly.org> - 1.2.0-1
- Added `.npmrc`: scopes `@aetherAssembly` to the GitHub Package Registry (`https://npm.pkg.github.com`) so `npm install` resolves the shared packages without a global registry override.
- Local package names: BIG's own workspace packages renamed from `@aetherAssembly/core` and `@aetherAssembly/ui` to `@before-its-gone/core` and `@before-its-gone/ui` to avoid name collision with the published shared packages now installed at the root.
- `packages/core` storage: the local `KeyValueStorage` interface and `BrowserLocalStorageAdapter` class have been removed. `packages/core` now re-exports `LocalStorageAdapter` and `StorageAdapter` directly from `@aetherAssembly/core`, keeping the public API identical for all callers.
- `apps/web` Vite aliases: `@aetherAssembly/core` and `@aetherAssembly/ui` aliases updated to resolve to the renamed `@before-its-gone/*` local workspace packages.

* Thu Jun 18 2026 Aster <support@aetherassembly.org> - 1.1.2-1
- Add BuildRequires: hicolor-icon-theme so OBS check-filelist finds the
  icon directories present in the build root (Requires: alone is runtime-only
  and does not install the package into the build chroot).
- Add scripts/test-rpm-spec.sh and npm run test:rpm-spec for local spec
  validation: stages the electron-builder x86_64 RPM as both sources and
  runs rpmbuild -bb with output isolated to .rpmbuild/ (gitignored).

* Wed Jun 17 2026 Aster <support@aetherassembly.org> - 1.1.1-3
- Add Requires: hicolor-icon-theme so openSUSE's check-filelist accepts
  the /usr/share/icons/hicolor/ directories as owned by a declared dependency.
  Fedora/RHEL found this transitively; OBS requires it to be explicit.

* Wed Jun 17 2026 Aster <support@aetherassembly.org> - 1.1.1-2
- Fix /opt path casing in %%files and __requires/provides_exclude_from macros.
  %%{name} expands to lowercase but electron-builder installs to /opt/Before-Its-Gone
  (productName casing), causing rpmbuild to fail with "File not found" on all distros.
- Remove /usr/bin/%%{name} from %%files: electron-builder's RPM does not install a
  wrapper script there.
- Strip /usr/lib/.build-id from BUILDROOT in %%install: the upstream RPM carries
  build-id symlinks that would otherwise cause "unpackaged files" errors.

* Wed Jun 17 2026 Aster <support@aetherassembly.org> - 1.1.1-1
- Fix /usr/* glob in %%files conflicting with filesystem package on Fedora.
  Replace with explicit paths to avoid claiming ownership of system directories.

* Tue Jun 16 2026 Aster <support@aetherassembly.org> - 1.1.0-2
- Fetch x86_64 and aarch64 sources as separate static Sources instead of
  a %%{_arch}-templated Source0, since Copr's dist-git cache only fetches
  sources once at import time and broke non-importer-arch chroots.

* Tue Jun 16 2026 Aster <support@aetherassembly.org> - 1.1.0-1
- Update to upstream release 1.1.0.

* Tue Jun 16 2026 Aster <support@aetherassembly.org> - 1.0.1-1
- Initial COPR/OBS packaging, repackaging the upstream electron-builder .rpm.
- Builds for both x86_64 and aarch64.