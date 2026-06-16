%global debug_package %{nil}

# The app under /opt is a self-contained Electron/Chromium bundle, same as
# upstream ships it. Don't let rpmbuild scan its private .so files for
# auto-Requires/Provides -- that produces noisy and sometimes wrong deps.
%global __requires_exclude_from ^/opt/%{name}/.*$
%global __provides_exclude_from ^/opt/%{name}/.*$

Name:           before-its-gone
Version:        1.0.1
Release:        1%{?dist}
Summary:        Track what's in your fridge, freezer, and pantry before it expires

License:        AGPL-3.0-only
URL:            https://github.com/AetherAssembly/Before-Its-Gone
# electron-builder's rpm filenames already use rpm's own arch names
# (x86_64 / aarch64), so %%{_arch} maps directly -- no translation needed
# here (unlike the AppImage/deb assets, which use "arm64").
Source0:        https://github.com/AetherAssembly/Before-Its-Gone/releases/download/v%{version}/before-its-gone-%{version}-%{_arch}.rpm

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
rpm2cpio %{SOURCE0} | cpio -idm

%build
# Nothing to build; the upstream .rpm's payload is extracted in %%prep and
# installed as-is in %%install.

%install
mkdir -p %{buildroot}
cp -a opt %{buildroot}/
cp -a usr %{buildroot}/

%files
/opt/*
/usr/*

%changelog
* Tue Jun 16 2026 Aster <support@aetherassembly.org> - 1.0.1-1
- Initial COPR/OBS packaging, repackaging the upstream electron-builder .rpm.
- Builds for both x86_64 and aarch64.
