%global debug_package %{nil}
# No debug package, so the build-id symlinks under /usr/lib/.build-id serve
# no purpose -- disable their generation to avoid "file listed twice"
# warnings against the /usr/* glob below.
%global _build_id_links none

# The app under /opt is a self-contained Electron/Chromium bundle, same as
# upstream ships it. Don't let rpmbuild scan its private .so files for
# auto-Requires/Provides -- that produces noisy and sometimes wrong deps.
%global __requires_exclude_from ^/opt/Before-Its-Gone/.*$
%global __provides_exclude_from ^/opt/Before-Its-Gone/.*$

Name:           before-its-gone
Version:        1.1.1
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

%files
/opt/Before-Its-Gone
/usr/bin/%{name}
/usr/share/applications/%{name}.desktop
/usr/share/icons/hicolor/*/apps/%{name}.png

%changelog
* Wed Jun 17 2026 Aster <support@aetherassembly.org> - 1.1.1-2
- Fix /opt path casing in %%files and __requires/provides_exclude_from macros.
  %%{name} expands to lowercase but electron-builder installs to /opt/Before-Its-Gone
  (productName casing), causing rpmbuild to fail with "File not found" on all distros.

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