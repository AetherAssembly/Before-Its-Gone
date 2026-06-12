# Maintainer: Aster <support@aetherassembly.org>
pkgname=before-its-gone
pkgver=PKGVER_PLACEHOLDER
pkgrel=1
pkgdesc="A food inventory tracker that helps you use items before they expire"
arch=(ARCH_LIST_PLACEHOLDER)
url="https://github.com/AetherAssembly/Before-Its-Gone"
license=('MIT')
depends=('fuse2' 'hicolor-icon-theme')
options=('!strip')

_tag=TAG_PLACEHOLDER
ARCH_SOURCES_PLACEHOLDER

prepare() {
    chmod +x "${pkgname}-${pkgver}-${CARCH}.AppImage"

    # Extract AppImage to pull out the icon without running the app
    "./${pkgname}-${pkgver}-${CARCH}.AppImage" --appimage-extract &>/dev/null
}

package() {
    # Install the AppImage
    install -Dm755 "${pkgname}-${pkgver}-${CARCH}.AppImage" \
        "${pkgdir}/opt/${pkgname}/${pkgname}.AppImage"

    # Wrapper so the binary is on $PATH
    install -Dm755 /dev/stdin "${pkgdir}/usr/bin/${pkgname}" <<EOF
#!/bin/sh
exec /opt/${pkgname}/${pkgname}.AppImage "\$@"
EOF

    # Desktop entry
    install -Dm644 /dev/stdin "${pkgdir}/usr/share/applications/${pkgname}.desktop" <<EOF
[Desktop Entry]
Name=Before It's Gone
Comment=Track your food inventory and reduce waste
Exec=/opt/${pkgname}/${pkgname}.AppImage --no-sandbox %U
Icon=${pkgname}
Type=Application
Categories=Utility;
StartupWMClass=before-its-gone
EOF

    # Icons extracted from AppImage in prepare()
    for size in 512 256 128 64 48; do
        local _src="${srcdir}/squashfs-root/usr/share/icons/hicolor/${size}x${size}/apps/${pkgname}.png"
        if [[ -f "${_src}" ]]; then
            install -Dm644 "${_src}" \
                "${pkgdir}/usr/share/icons/hicolor/${size}x${size}/apps/${pkgname}.png"
        fi
    done

    # Fallback to .DirIcon if per-size icons weren't found
    if [[ -f "${srcdir}/squashfs-root/.DirIcon" ]]; then
        install -Dm644 "${srcdir}/squashfs-root/.DirIcon" \
            "${pkgdir}/usr/share/icons/hicolor/512x512/apps/${pkgname}.png"
    fi
}
