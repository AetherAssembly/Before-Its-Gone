# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project uses semantic versioning.

## [1.3.1-beta.1] - Unreleased Beta

### Changed

- **App icon:** replaced the placeholder icon with the BIG carrot rocket logo across all targets (Electron, PWA 192px/512px, Linux release bundles). SVG and PNG assets updated.

---

## [1.3.0] - 2026-07-06

### Added

- **Virtual scrolling:** the inventory list now uses a windowed virtualizer, rendering only the visible cards rather than the full list. Large inventories no longer cause layout jank on lower-end hardware.
- **Pre-commit hook:** Husky + lint-staged added. ESLint runs automatically on staged `.ts`/`.tsx` files before every commit. Run `npm install` once to activate the hook.
- **Extended test suite:** 38 additional unit tests in `packages/core` covering `calculateExpiryStatus` boundary conditions, `normalizeDate` format variants, `getShoppingList` threshold logic, and `getFrequentItems` sorting and limit behaviour. Total test count: 102.
- **`docs/data-model.md`:** dedicated reference page for the `InventoryItem` field schema, linked from the Docs section of the README.
- **Screenshots in README:** inventory list, add item form, charts, shopping list, and settings views.
- **`docs/demo-data.json`:** sample dataset with 15 items across all three locations and all three expiry statuses, importable via Data → Import JSON for development and testing.

### Changed

- **Dependency bumps:** `electron` 42.5.1 → 43.0.0 (electronVersion in packaging scripts updated to match), `@supabase/supabase-js` 2.108.2 → 2.110.0, `nodemailer` 9.0.1 → 9.0.3, `resend` 6.16.0 → 6.17.1, `recharts` 3.9.0 → 3.9.2, `i18next` 26.3.3 → 26.3.4, `vitest` + `@vitest/coverage-v8` 4.1.9 → 4.1.10, `prettier` 3.9.3 → 3.9.4, `@types/node` 26.0.1 → 26.1.0.

### Fixed

- **Coverage report tracked in git:** `packages/core/coverage/` was committed despite `*.tsbuildinfo` already being gitignored. Added explicit `packages/core/coverage/` entry to `.gitignore` and removed the directory from the index.

---

## [1.2.1] - 2026-06-19

### Fixed

- **`tsc --build` failure on cold/clean builds:** `packages/core/src/storage.ts` imported `LocalStorageAdapter` and `StorageAdapter` from `@aetherAssembly/core` via a symlinked cross-repo dependency. TypeScript resolved the module through the build cache but failed on clean builds where the cache was absent. Both types are now inlined directly in `storage.ts`, removing the external dependency entirely.

### Changed

- **Workspace package names:** `@before-its-gone/core` and `@before-its-gone/ui` renamed to `@aetherAssembly/big-core` and `@aetherAssembly/big-ui`. The `@before-its-gone` npm scope has no matching GitHub owner, causing `npm publish` to return a 403. The new names use the `@aetherAssembly` org scope, which matches the GitHub organisation.
- **`@aetherAssembly/big-core` publish tarball:** added a `files` field (`["dist", "LICENSE"]`) to exclude `coverage/`, `src/`, `tsconfig.json`, and `vitest.config.ts` from the published package.

## [1.2.0] - 2026-06-19

### Added

- **`.npmrc`:** scopes `@aetherAssembly` to the GitHub Package Registry (`https://npm.pkg.github.com`) so `npm install` resolves the shared packages without a global registry override.

### Changed

- **Shared package dependencies:** `@aetherAssembly/core` and `@aetherAssembly/ui` are now consumed from the GitHub Package Registry (`^1.0.0`) rather than a `file:` path, making the repo self-contained for any contributor.
- **Local package names:** BIG's own workspace packages renamed from `@aetherAssembly/core` and `@aetherAssembly/ui` to `@before-its-gone/core` and `@before-its-gone/ui` to avoid name collision with the published shared packages now installed at the root.
- **`packages/core` storage:** the local `KeyValueStorage` interface and `BrowserLocalStorageAdapter` class have been removed. `packages/core` now re-exports `LocalStorageAdapter` and `StorageAdapter` directly from `@aetherAssembly/core`, keeping the public API identical for all callers.
- **`apps/web` Vite aliases:** `@aetherAssembly/core` and `@aetherAssembly/ui` aliases updated to resolve to the renamed `@before-its-gone/*` local workspace packages.

## [1.1.2] - 2026-06-18

### Fixed

- **OBS packaging:** Added `BuildRequires: hicolor-icon-theme` to the RPM spec. OBS `check-filelist` runs at build time and requires the package to be present in the build chroot to confirm ownership of the `/usr/share/icons/hicolor/` directories. `Requires:` is runtime-only and does not install the package into the build chroot, causing Tumbleweed and Leap builds to fail. Fedora/COPR found it transitively.
- **Image upload hang:** `resizeImage` in `ItemDrawer.tsx` had no `img.onerror` handler. Uploading a corrupt or unsupported image file caused the returned `Promise` to never settle, freezing the photo upload UI indefinitely. Added rejection with cleanup of the object URL.
- **CSV date timezone shift:** Expiry dates in CSV import were constructed as `new Date('YYYY-MM-DDT23:59:59').toISOString()`, which treats the time as local time. In UTC− timezones this shifted the stored date forward by one day. Dates are now stored as explicit UTC (`T23:59:59.000Z`) and the display code in `buildEditForm` now extracts the local date using `getFullYear/getMonth/getDate` rather than `.toISOString().slice(0, 10)`.
- **Photo field cleared on edit:** Passing `photo: undefined` in a patch to `updateInventoryItem` caused the spread to overwrite the stored photo with `undefined`, silently clearing it. The function now strips `undefined` values from the patch before spreading; `null` still explicitly clears the field.
- **Tags lost on CSV round-trip:** The CSV export did not include a `tags` column, so tags were silently dropped on export and could not survive a re-import. Tags are now exported (semicolon-separated) and survive a full export → re-import cycle.
- **Scanner save race condition:** The phone scanner stored the active save's `resolve`/`reject` callbacks in module-level globals. A second scan arriving while a save was in flight would overwrite them, causing the wrong promise to settle. Added `scannerSaveLock` in `main.ts` to reject concurrent saves until the first completes or times out.
- **Email digest double-fire after restart:** `DigestScheduler` used an in-memory `lastFiredDate` guard that reset on restart, allowing the digest to fire again within the same day if the app restarted during the target minute. Added a disk-backed guard that checks `lastSentAt` from `email-settings.json` for daily digests.
- **Orphaned undo timer on edit:** Editing an item while the "Use one" undo toast was pending left the undo `setTimeout` running. The timer now fires against stale state once it expires. `onEditSave` now clears the pending undo before proceeding.

### Added

- **`normalizeDate` utility** (`packages/core/src/inventory.ts`): accepts expiry dates in any common human-written format (ISO date, ISO timestamp, `MM/DD/YYYY`, `M/D/YYYY`, `YYYY/MM/DD`, `DD-MM-YYYY`, `"June 1, 2026"`, `"1 Jun 2026"`, etc.) and returns a canonical `YYYY-MM-DDT23:59:59.000Z` string. Called automatically during CSV import so users do not need to know ISO format. Invalid dates (including JS-overflowed values like `Feb 30`) return `null` and cause the row to be skipped. 26 unit tests added in `packages/core/src/__tests__/inventory.test.ts`.
- **`npm run package:linux:rpm`:** builds only the `.rpm` artifact via electron-builder, skipping AppImage and `.deb`.
- **`npm run test:rpm-spec`:** builds the x86_64 RPM if not already present, stages it as both sources for rpmbuild, and runs `rpmbuild -bb` against `docs/packaging/linux/fedora/before-its-gone.spec` with output isolated to `.rpmbuild/` (gitignored). Prints install instructions if `rpmbuild` is not found. Pass `--skip-build` to reuse an existing `release/` artifact.
- **GHCR Docker image:** the release pipeline now builds and pushes `ghcr.io/aetherAssembly/before-its-gone` on every version tag. Tagged as `{{version}}`, `{{major}}.{{minor}}`, and `latest`. Exposes port 80 (HTTP) for use behind a reverse proxy; the local `docker/Dockerfile` with self-signed certs is unchanged for direct HTTPS setups. Uses `docker/Dockerfile.ghcr` + `docker/nginx-http.conf`.
- **Version consistency workflow** (`.github/workflows/version-check.yml`): runs on every push and PR; compares the version in `package.json`, `before-its-gone.spec`, and the top `CHANGELOG.md` entry, failing with file-level `::error` annotations if any drift is found.

### Changed

- **CSV export** now includes `tags` (semicolon-separated), `shelf_life_days`, and `depletion_threshold` columns. `expiresAt` is now exported as a date-only string (`YYYY-MM-DD`) rather than a full ISO timestamp, matching what the importer expects and making the file human-readable.
- **Packaging docs:** Standardised "Supported versions" sections across all Linux packaging READMEs to prose style. AUR, Raspberry Pi OS, and Snap docs gained the section for the first time.
- **CONTRIBUTING.md:** Added "Gotchas and non-obvious behaviour" section documenting date storage rules, `undefined` vs `null` patch semantics, scanner save lock, digest deduplication layers, image upload error handling, and the CSV tag separator convention.
- **CI action versions:** `actions/upload-artifact` and `actions/download-artifact` bumped from `@v4` to `@v7` in the RPM spec test workflow.

---

For older releases (1.1.1 and below), see the [full changelog on the wiki](https://aetherassembly.org/wiki/before-its-gone/changelog.html).
