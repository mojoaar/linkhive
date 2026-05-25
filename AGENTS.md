# AGENTS.md — LinkHive

## Architecture

- **Zero-dependency SPA** — pure HTML/CSS/JS. No npm, no build step, no CDN. Open `index.html` directly or serve via any static server.
- **Storage**: IndexedDB (`linkhive_db`) via `js/storage.js`, with in-memory fallback if IndexedDB is unavailable. GitHub sync uses chunked JSON files in `data/` (500 links per chunk to stay under 1MB limit).
- **Config**: `localStorage['linkhive_config']` for user settings. `config.json` (gitignored, copy from `config.example.json`) for server-managed deploys — loaded once at boot in `configStore.js:loadServerConfig()`.

## Script load order (critical)

13 files in `index.html`, loaded synchronously in this order. Each depends on the previous:

1. `js/config.js` — constants, DEFAULTS, STORE, DB, icon/color arrays
2. `js/icons.js` — SVG icon renderer, defines `window.refreshIcons`
3. `js/configStore.js` — `LinkHive.Config` (get/save/exists/migrate/loadServerConfig)
4. `js/utils/dom.js` — `_$`, `_$$`, DOM helpers, `LinkHive.$`, `LinkHive.$$`
5. `js/utils/github.js` — `LinkHive.GitHubClient`
6. `js/storage.js` — `LinkHive.LocalBackend`, `LinkHive.GitHubBackend`
7. `js/themes.js` — `LinkHive.Themes`
8. `js/linkStore.js` — `LinkHive.LinkStore` (CRUD, search, tag ops)
9. `js/ui/forms.js` — URL metadata parser (CORS proxies)
10. `js/ui/modals.js` — Settings, link, collection modals
11. `js/ui/sidebar.js` — Navigation, profile, collection list
12. `js/ui/linkGrid.js` — Link card rendering, bulk ops
13. `js/app.js` — `LinkHive.App`, `LinkHive.Sync`, `LinkHive.Toast`, init IIFE

## DOM references — never use `$` directly

`app.js:mapDomRefs()` uses a local `qs()` function (`document.querySelector`). Global `$` can be hijacked by browser extensions. Always use `LinkHive.DOM.keyName` or the local `qs()` pattern. Other modules receive DOM refs via their `init(dom)` method.

## Theme system

CSS custom properties on `<html>` via `data-theme` and `data-mode` attributes. Nine themes: Catppuccin (Macchiato, Latte, Frappé, Mocha), Dracula, GitHub, Nord, One Dark, Tokyo Night — each with dark/light modes. Theme toggle in `themes.js:toggle()` toggles `data-mode` and updates the moon/sun icon in `.theme-toggle-icon` span.

## Icon system

`js/icons.js` contains ~350 inline SVG paths in a `ICONS` object. `renderIcons()` replaces `[data-lucide]` elements with `<svg>` elements. No CDN, no external dependencies. To add an icon: add a path entry to `ICONS` in `icons.js`, then add the name to `COLLECTION_ICONS` in `config.js`.

## Link list view CSS

The list view card structure is a deliberately simple block layout — the header is a flex row with `[checkbox] [favicon] [title flex:1] [actions]`. Description and bottom-row (tags + collection/date) sit below as block elements. Do NOT restructure this with flex-wrap or absolute positioning — it was iterated extensively and the current layout works.

## Auto-sync

`LinkHive.Sync.autoSync()` fires silently 2 seconds after any link add/edit/delete or collection CRUD. Debounced — rapid changes trigger only one sync. Only activates when `storage === 'github'` and token + repo are configured.

## CSV import

Raindrop.io CSV import uses a state-machine parser in `modals.js:parseCSV()` that handles quoted fields with embedded commas and newlines. Writes collections in one transaction, then links in batches of 200 per IndexedDB transaction.

## Service worker

`sw.js` caches all static assets on install. Cache-first with network fallback. Must update `STATIC_ASSETS` array when adding/removing JS or CSS files.

## File conventions

- `config.json` is gitignored — never commit secrets
- `.DS_Store` is gitignored
- No framework, no TypeScript, no JSX — vanilla JS only
- CSS uses CSS custom properties defined in `themes.css` — never hardcode theme colors in components

## Browser extension

`extensions/chrome/` is a Chrome MV3 extension that saves links from any tab via `Cmd+Shift+L`. Uses a settings form (token, repo, branch) persisted via `chrome.storage.sync`. Reads/writes links and collections directly to the GitHub repo's `data/` directory. Key files:

- `popup/popup.html` + `popup.js` + `popup.css` — the popup UI
- `shared/data-model.js` — `LinkHiveExt` utilities (makeLink, isDuplicate, findLinkByUrl)
- `shared/github.js` — `LinkHiveExt` GitHub API client (fetchCollections, fetchLinks, addLink, updateLink)
- `icons/` — cloud icons for light and dark mode toolbars
- `background.js` — service worker for `onInstalled` and icon switching via `onMessage`

## Versioning

- **Minor releases** (`0.2.0`, `0.3.0`, ...): bump `LinkHive.VERSION` in `config.js`, update `README.md` changelog, create Git tag, push with `--tags`
- **Patch/bugfix releases**: bump `LinkHive.VERSION` (e.g. `0.2.1`), update changelog, commit and push to `main` — **no Git tag**
- **Bundle minor fixes**: accumulate small fixes locally. User will explicitly say when to bundle and push as the next `v0.2.X`. Do NOT increment version or push until asked.

## Deploy

- Static file server (Caddy, Nginx, GitHub Pages)
- Copy `config.example.json` → `config.json` for pre-configured GitHub sync
- `manifest.json` + `sw.js` enable PWA install
