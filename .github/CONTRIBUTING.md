# Contributing to Before It's Gone

Thanks for wanting to help! Here's everything you need to know to get started.

---

## Ways to contribute

- **Bug reports** — open a [bug report](https://github.com/AetherAssembly/Before-Its-Gone/issues/new?template=bug_report.yml)
- **Feature requests** — open a [feature request](https://github.com/AetherAssembly/Before-Its-Gone/issues/new?template=feature_request.yml)
- **Code** — fork the repo, make your changes, and open a pull request against `main`
- **Questions / support** — email [support@aetherassembly.org](mailto:support@aetherassembly.org)

---

## Ground rules

- Be respectful and constructive in all discussion.
- Keep changes focused — one logical change per PR.
- Update `CHANGELOG.md` for any user-visible fix or feature (under the current unreleased version).
- Bump the version in all five `package.json` files (root, `apps/electron`, `apps/web`, `packages/core`, `packages/ui`) if your change warrants a release — they must stay in sync.
- Don't introduce new dependencies without a clear reason — explain the choice in your PR.

---

## Development setup

**Prerequisites:** Node.js 22 or later, npm 10 or later.

```bash
# Clone and install all workspace dependencies
git clone https://github.com/AetherAssembly/Before-Its-Gone.git
cd Before-Its-Gone
npm ci
```

The repo is an npm workspaces monorepo with four packages:

| Package | Path | Purpose |
|---------|------|---------|
| `before-its-gone-electron` | `apps/electron` | Electron main process, IPC handlers, scanner server |
| `before-its-gone-web` | `apps/web` | React renderer (Vite) |
| `@before-its-gone/core` | `packages/core` | Shared business logic: inventory CRUD, barcode profiles, expiry prediction, CSV/JSON import-export. All database interactions are routed through `InventoryService` and `ImportExportService` in `src/services/` — avoid calling storage functions directly. |
| `@before-its-gone/ui` | `packages/ui` | Shared React components (InventoryCard) |

**Run in development (from repo root):**

```bash
npm run dev
```

This starts the Vite dev server and Electron concurrently. On Linux the app auto-detects Wayland; to override:

```bash
BIG_LINUX_DISPLAY_BACKEND=x11 npm run dev
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
```

Both must pass before opening a PR.

---

## Pull request process

1. Fork the repo and create a branch from `main`:

   ```bash
   git checkout -b fix/describe-your-change
   ```

2. Make your changes. Test on the platform(s) your change affects.
3. Run `npm run lint` and `npm run build` — fix anything that fails.
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

Artifacts are written to `release/` (gitignored — local output only, not committed to the repo).

---

## Import & export formats

Full documentation for the JSON and CSV import/export formats — including field reference tables, date format rules, and examples — is in [`docs/import-export-format.md`](../docs/import-export-format.md).

---

## Code style

- TypeScript everywhere — no plain `.js` source files.
- ESLint enforces style; don't disable rules without a comment explaining why.
- No comments that describe *what* the code does — only *why*, when the reason isn't obvious from the code itself.
- React components live in `apps/web/src` or `packages/ui/src`; shared business logic lives in `packages/core/src`.

---

## Credit

If you use Before It's Gone (or any of its code) as a base for your own project, please include a credit to [AetherAssembly](https://aetherassembly.org/about).
