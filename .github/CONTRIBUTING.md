# Contributing to Before It's Gone

Thanks for wanting to help! Here's everything you need to know to get started.

---

## Ways to contribute

- **Bug reports:** open a [bug report](https://github.com/AetherAssembly/Before-Its-Gone/issues/new?template=bug_report.yml)
- **Feature requests:** open a [feature request](https://github.com/AetherAssembly/Before-Its-Gone/issues/new?template=feature_request.yml)
- **Code:** fork the repo, make your changes, and open a pull request against `main`
- **Questions / support:** email [support@aetherassembly.org](mailto:support@aetherassembly.org)

---

## Ground rules

- Be respectful and constructive in all discussion.
- Keep changes focused; one logical change per PR.
- Update `CHANGELOG.md` for any user-visible fix or feature (under the current unreleased version).
- Bump the version in all five `package.json` files (root, `apps/electron`, `apps/web`, `packages/core`, `packages/ui`) if your change warrants a release; they must stay in sync.
- Don't introduce new dependencies without a clear reason; explain the choice in your PR.

---

## Development setup

**Prerequisites:** Node.js 22 or later, npm 10 or later.

### GitHub Packages auth (required)

Before Its Gone depends on `@aetherAssembly/core` and `@aetherAssembly/ui`, which are published to the GitHub Package Registry. GitHub Packages requires authentication even for public packages. You need a [personal access token](https://github.com/settings/tokens/new) with the `read:packages` scope.

Add it to your global `~/.npmrc` (create the file if it doesn't exist):

```
//npm.pkg.github.com/:_authToken=YOUR_TOKEN
```

The repo's `.npmrc` already scopes `@aetherAssembly` to `npm.pkg.github.com`, so `npm install` will pick up the token automatically.

### Clone and install

```bash
git clone https://github.com/AetherAssembly/Before-Its-Gone.git
cd Before-Its-Gone
npm ci
```

### Package structure

The repo is an npm workspaces monorepo. It also depends on two upstream packages from the [aether-packages](https://github.com/AetherAssembly/aether-packages) repo, installed at the root:

| Package | Source | Purpose |
| ------- | ------ | ------- |
| `@aetherAssembly/core` | [aether-packages](https://aetherassembly.org/wiki/aether-packages/) (upstream) | Storage adapters (`IDBAdapter`, `LocalStorageAdapter`) and shared TypeScript types |
| `@aetherAssembly/ui` | [aether-packages](https://aetherassembly.org/wiki/aether-packages/) (upstream) | Shared React component library (`Button`, `Badge`, `Card`, etc.) |
| `before-its-gone-electron` | `apps/electron` (local) | Electron main process, IPC handlers, scanner server |
| `before-its-gone-web` | `apps/web` (local) | React renderer (Vite); also built as the self-hosted PWA |
| `@aetherAssembly/big-core` | `packages/core` (local) | BIG's business logic: inventory CRUD, barcode profiles, expiry prediction, CSV/JSON import-export. Re-exports `LocalStorageAdapter` from `@aetherAssembly/core` for settings storage. All database interactions are routed through `InventoryService` and `ImportExportService` in `src/services/`. |
| `@aetherAssembly/big-ui` | `packages/ui` (local) | BIG's React components (`InventoryCard`). Uses `Badge` and other primitives from `@aetherAssembly/ui`. |

The upstream packages are consumed as versioned npm installs; you don't edit them here. Changes to shared types or storage adapters belong in the [aether-packages](https://github.com/AetherAssembly/aether-packages) repo.

**Run in development (from repo root):**

```bash
npm run dev
```

This starts the Vite dev server and Electron concurrently. On Linux the app auto-detects Wayland; to override:

```bash
BIG_LINUX_DISPLAY_BACKEND=x11    npm run dev
BIG_LINUX_DISPLAY_BACKEND=wayland npm run dev
```

**Build packages only (needed before web/electron builds):**

```bash
npm run build:packages   # tsc --build for packages/core and packages/ui (incremental, dependency-ordered)
npm run build:web        # build:packages + Vite production build
npm run build            # full build including Electron main process
```

**Lint and type-check:**

```bash
npm run lint    # ESLint across all packages
npm run build   # TypeScript compilation for all targets
npm run test    # Vitest unit tests (packages/core)
```

All three must pass before opening a PR.

---

## Pull request process

1. Fork the repo and create a branch from `main`:

   ```bash
   git checkout -b fix/describe-your-change
   ```

2. Make your changes. Test on the platform(s) your change affects.
3. Run `npm run lint`, `npm run build`, and `npm run test`; fix anything that fails.
4. Update `CHANGELOG.md` under the current unreleased version heading.
5. Open a PR against `main` using the pull request template. Fill in every section.

PRs that only update docs or GitHub config files don't need platform testing notes.

---

## Building release artifacts

Platform-specific packaging commands (run from the repo root):

```bash
npm run package:windows   # NSIS installer + portable .exe
npm run package:macos     # .dmg
npm run package:linux     # AppImage, .deb, .rpm (all architectures)
npm run package:appimage  # AppImage only
```

Artifacts are written to `release/` (gitignored; local output only, not committed to the repo).

The `PKGBUILD` for Arch Linux is generated automatically by the release workflow; it is not meant to be built locally. If you need to test it, download it from a published GitHub release and run `makepkg -si`.

---

## Where things live

Before adding a feature, identify which layer it belongs to:

| What you're adding | Where it goes |
| ------------------ | ------------- |
| A new data field on an inventory item | `packages/core/src/models.ts` |
| A new filter or query | `packages/core/src/inventory.ts` |
| A new storage key (localStorage) | `packages/core/src/storage.ts` using `LocalStorageAdapter` (re-exported from upstream `@aetherAssembly/core`), key constant in `models.ts` |
| A new IndexedDB object store | `packages/core/src/storage.ts`: increment DB version, add upgrade branch |
| A new UI component (reusable) | `packages/ui/src/` |
| A new UI panel or tab | `apps/web/src/App.tsx` or a new `*Panel.tsx` sibling |
| Something that needs Node.js (file system, native modules, sending email) | `apps/electron/src/` behind an IPC handler |
| Something only the packaged app can do | guard it with `if (window.beforeItsGone?.yourMethod)` in the renderer |

See [`docs/architecture.md`](../docs/architecture.md) for a full overview of the layers, data flows, and key decisions.

---

## Adding an IPC channel

If your feature needs to cross the renderer/main boundary (e.g. reading a file, calling a native API, sending email):

1. **Define the handler** in `apps/electron/src/main.ts`:

   ```typescript
   ipcMain.handle('your:channel', async (_event, arg: YourType) => {
     // Node.js-side logic here
     return result;
   });
   ```

2. **Expose it through the bridge** in `apps/electron/src/preload.ts`:

   ```typescript
   contextBridge.exposeInMainWorld('beforeItsGone', {
     // ...existing entries...
     yourMethod: (arg: YourType) => ipcRenderer.invoke('your:channel', arg),
   });
   ```

3. **Type it** in `apps/web/src/vite-env.d.ts` under the `Window.beforeItsGone` interface.

4. **Call it** from the renderer with a feature guard:

   ```typescript
   const result = await window.beforeItsGone?.yourMethod(arg);
   ```

The feature guard ensures the web-only build (`npm run dev:web`) doesn't throw when Electron APIs are absent.

---

## Adding an IndexedDB object store

If your feature needs persistent structured storage beyond key-value pairs:

1. Add your type to `packages/core/src/models.ts`.
2. Add the store to the `BeforeItsGoneDB` schema interface in `packages/core/src/storage.ts`.
3. Increment the DB version constant (`openDB('before-its-gone', N + 1, ...)`) and add an `if (oldVersion < N + 1)` upgrade branch that creates the new store.
4. Add CRUD functions (`list*`, `upsert*`, `remove*`) below the existing ones.
5. Export the new functions from `packages/core/src/index.ts`.

Never remove or modify existing upgrade branches; they run for users upgrading from older versions.

---

## Testing

### Automated tests

`packages/core` has a Vitest unit test suite covering the core inventory logic:

```bash
npm run test           # run all tests (packages/core)
npm run test:coverage  # run with branch coverage report
```

Tests live in `packages/core/src/__tests__/inventory.test.ts`. When adding or changing pure functions in `packages/core`, add corresponding tests. The storage layer is mocked via `vi.mock('../storage', ...)`; no IndexedDB or DOM required.

### Manual testing

- **Renderer logic** (UI, interactions): run `npm run dev:web` and exercise the feature in the browser. The dev server binds to `0.0.0.0:5173`, so you can also open it from a phone on the same network. Check the browser DevTools console for errors.
- **Electron-specific features** (IPC, scanner, email, auto-updater): run `npm run dev` and test in the full Electron app.
- **PWA / Docker:** Generate a self-signed cert:

```bash
mkdir -p docker/certs 

openssl req -x509 -newkey rsa:4096 -keyout docker/certs/key.pem -out docker/certs/cert.pem -days 3650 -nodes -subj "/CN=localhost"
```

Then run `npm run docker:pwa:up` and open `https://localhost` in a browser. Verify the install prompt, service worker, and barcode scanner.

- **Platform packaging**: run `npm run package:<your-platform>` and install the output artifact. Verify the auto-updater manifest path matches the GitHub release URL pattern if your change touches update files.
- **Email**: use the "Send test email" button in Settings. For SMTP, a local SMTP catcher such as Mailpit on `localhost:1025` is useful for development.
- **Cloud sync**: create a Supabase project, run the SQL migration from `docs/cloud-sync.md`, and test sign-in + Sync now.

---

## Import & export formats

Full documentation for the JSON and CSV import/export formats, including field reference tables, date format rules, and examples; see [`docs/import-export-format.md`](../docs/import-export-format.md).

---

## External APIs

The app integrates with four external services. Open Food Facts and TheMealDB require no API keys. Resend and Supabase require free-tier accounts configured by the user. See [`docs/api-setup.md`](../docs/api-setup.md) for details on each service, and [`docs/smtp-config.md`](../docs/smtp-config.md) for SMTP provider-specific setup.

---

## Issue labels

| Label | Meaning |
| ----- | ------- |
| `bug` | Something broken in an existing release |
| `feature` | New capability or user-visible behaviour |
| `enhancement` | Improvement to an existing feature |
| `docs` | Documentation only |
| `good first issue` | Small, well-scoped, low risk; good for first contributions |
| `electron` | Affects the Electron main process or packaging |
| `core` | Affects `packages/core` business logic |

---

## Gotchas and non-obvious behaviour

Things that have caused bugs in the past and will trip you up if you don't know about them.

### Date storage and display

Expiry dates are stored as UTC ISO strings (`2026-06-01T23:59:59.000Z`). When displaying a date back to the user in a form input, always extract the **local** date:

```typescript
// Correct — local date, matches what the user entered
const d = new Date(item.expiresAt);
const display = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Wrong — UTC date, off by one day for users in UTC- timezones
const display = new Date(item.expiresAt).toISOString().slice(0, 10);
```

When storing a date entered by the user (from a `<input type="date">` that returns `YYYY-MM-DD`), use explicit UTC end-of-day:

```typescript
// Correct — timezone-independent, round-trips cleanly
const expiresAt = `${form.expiryDate}T23:59:59.000Z`;

// Wrong — interpreted as local time, stores a different UTC timestamp per timezone
const expiresAt = new Date(`${form.expiryDate}T23:59:59`).toISOString();
```

### Patches to `updateInventoryItem`

`updateInventoryItem` spreads the patch over the existing item. If you pass `photo: undefined` in the patch (e.g. via `photo: someVar || undefined`), the spread **does** write `undefined` over the stored photo, clearing it. The function strips `undefined` values from the patch before spreading, so passing `undefined` means "leave this field alone", and passing `null` means "clear it".

```typescript
// Leaves the existing photo in place
await inventoryService.update(id, { name: 'New name' });

// Also leaves photo in place (undefined is stripped)
await inventoryService.update(id, { name: 'New name', photo: undefined });

// Clears the photo (null is kept)
await inventoryService.update(id, { name: 'New name', photo: null });
```

### Scanner IPC save flow

The phone scanner server calls back into the renderer via IPC when an item needs saving. Only one save can be in flight at a time; a second scan while a save is pending receives a `"A save is already in progress"` error from the server. If you add new save paths (e.g. bulk scan mode), check `scannerSaveLock` in `apps/electron/src/main.ts` first or wait for the existing promise to settle.

### Email digest scheduler

`DigestScheduler` runs a `setInterval` in the Electron main process. It uses two layers of deduplication:

- **In-memory `lastFiredDate`:** prevents firing twice in the same minute during a running session.
- **Disk-backed `lastSentAt`:** read from `email-settings.json`; prevents re-firing after the app restarts within the same UTC day.

The `lastSentAt` field must be written to disk by `fireDigest` (the callback passed to `DigestScheduler.start`) after a successful send. If you add a new digest trigger path, make sure it updates `lastSentAt`.

### Image upload in `resizeImage`

`resizeImage` in `apps/web/src/ItemDrawer.tsx` returns a `Promise<string>`. It rejects if the file fails to load (corrupt file, wrong MIME type, etc.). Always `await` it inside a `try/catch` and surface the error to the user; silently swallowing the rejection will leave the photo field empty without explanation.

### CSV tags separator

Tags in CSV files use **semicolons** as the separator (not commas), because items can be exported and re-imported and commas inside a CSV field would require extra quoting. The UI form accepts comma-separated tags from the user; these are stored as `string[]` internally. The CSV importer and exporter both use semicolons. Keep these two conventions separate.

---

## Code style

- TypeScript everywhere; no plain `.js` source files.
- ESLint enforces style; don't disable rules without a comment explaining why.
- No comments that describe *what* the code does; only *why*, when the reason isn't obvious from the code itself.
- React components live in `apps/web/src` or `packages/ui/src`; shared business logic lives in `packages/core/src`.

---

## Credit

If you use Before It's Gone (or any of its code) as a base for your own project, please include a credit to [AetherAssembly](https://aetherassembly.org/about).
