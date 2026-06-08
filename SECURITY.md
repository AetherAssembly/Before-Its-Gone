# Security Policy

## Supported Versions

Security fixes are applied to the current release and the two most recent major versions.

| Version | Supported |
|---------|-----------|
| 1.0.0-rc.x | ✅ Active support (current) |
| 0.9.x   | ✅ Active support |
| 0.8.x   | ⚠️ Deprecated — acknowledged, no longer actively patched |
| < 0.8.0 | ❌ Not supported |

As new versions are released, this table will be updated to reflect the current support window. Versions that fall outside the two-major-version window enter deprecated status and are acknowledged but no longer actively patched. Versions older than that are archived to cold storage. Retrieval of archived versions is available as a paid service — contact us at [support@aetherassembly.org](mailto:support@aetherassembly.org) for details.

## Reporting a Vulnerability

Please do not disclose security vulnerabilities in public issues.

Use GitHub private vulnerability reporting if enabled for this repository, or contact us through one of the following:

- **Email:** [support@aetherassembly.org](mailto:support@aetherassembly.org)
- **Contact form:** [https://forms.gle/T4i7GGzaT3HUrffm9](https://forms.gle/T4i7GGzaT3HUrffm9)
- **Aster (GitHub):** [@Aster1630](https://github.com/Aster1630)
- **Ollie (GitHub):** [@OllieMochi](https://github.com/olliemochi)

Please include in your report:

- A clear description of the issue
- Steps to reproduce
- Impact assessment
- Any suggested remediation or workaround

You can expect an initial acknowledgement within 7 days of receipt.

After validation, the maintainers will work on a fix and coordinate disclosure timing as appropriate.

## Scope

Before-Its-Gone is a local-first desktop application (Linux, macOS, Windows). The most relevant security areas are:

- Electron main/preload boundary and IPC usage
- Dependency vulnerabilities in the Electron and React toolchain
- Local data handling and unsafe filesystem or shell execution
- The LAN-accessible phone scanner server (HTTPS, token-gated, localhost-only by default)
- Packaged artifacts distributed through project releases (AppImage, .deb, .rpm, .dmg, .exe)

## Non-Security Issues

General bugs, feature requests, packaging problems, and compatibility issues should be reported through the normal issue tracker.
