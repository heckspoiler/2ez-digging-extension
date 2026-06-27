# 2ez-digging — Browser Extension

## What this is

2ez-digging is a SoundCloud mix scanner and track identifier. This repo is the **browser extension only**. It injects a scan button directly into SoundCloud mix pages and handles the full scan flow inline — no popup, no separate page.

- Backend repo: `2ez-digging-backend`
- Frontend repo: `2ez-digging-frontend`

---

## Browser targets

- **Chrome** — primary target (Manifest V3)
- **Firefox** — secondary target (Manifest V3, same codebase with minor tweaks)
- **Safari** — future milestone (requires Xcode conversion, out of scope for now)

---

## Stack

- **React** + **TypeScript** — extension UI
- **Vite** + `vite-plugin-web-extension` — build tooling
- **Bun** — package manager
- **CSS Modules** — styling
- **Manifest V3** — extension format (works for both Chrome and Firefox)

---

## Project structure

```
src/
├── background/
│   └── index.ts           # service worker — API calls, scan state, auth state
├── content/
│   ├── index.tsx           # injected into SoundCloud mix pages
│   └── index.css
├── components/
│   ├── ScanButton/         # injected button inside SoundCloud UI
│   ├── ScanProgress/       # SSE-driven progress display, shown inline
│   └── Tracklist/          # inline tracklist once scan is complete
├── api/
│   └── client.ts           # all backend API calls
└── types/
    └── index.ts
manifest.json
```

---

## UX — this is critical, do not deviate

### Toolbar icon

- The extension has a popup on click, the user needs to be able to log in from the browser extension to the database and submit mixes and see progress/que.
- The toolbar icon color reflects the user's login status:
  - **Coloured** (brand color) — user is logged in
  - **Grey** — user is not logged in
- Use `chrome.action.setIcon()` from the background service worker to update the icon when auth state changes
- Provide both grey and coloured icon variants in `/assets/icons/`

### Injected button on SoundCloud

- When the user is on a SoundCloud mix/set page, the content script injects a **2ez-digging icon button** directly into the SoundCloud page UI — styled to feel native to SoundCloud's dark UI
- The button color also reflects login status (same logic as toolbar icon)
- **If logged in**: clicking the button immediately triggers the scan
- **If not logged in**: clicking the button shows a small inline prompt to log in (link to the web app)
- The button should only appear on mix/set pages — not on profiles, search, or other SoundCloud pages

### Scan flow (logged in)

1. User clicks the injected button on a SoundCloud mix page
2. Content script sends the current URL to the background service worker
3. Background worker POSTs to `/scan` on the backend
4. Background worker opens SSE connection to `/scan/{id}/progress`
5. SSE events are forwarded to the content script
6. Progress is displayed inline on the SoundCloud page (replacing or augmenting the button)
7. On completion — tracklist is shown inline

---

## Auth

- Auth state is managed by the background service worker and stored in `chrome.storage.local`
- Auth token is retrieved from the web app (2ez-digging-frontend) — user logs in there, token is shared with the extension via `chrome.storage`
- Content script never handles auth directly — always asks background worker for current auth state via messaging

---

## API contract

Backend base URL stored in `.env`:

```
VITE_API_BASE_URL=http://localhost:8000
```

| Method | Endpoint              | Description                   |
| ------ | --------------------- | ----------------------------- |
| POST   | `/scan`               | Submit current SoundCloud URL |
| GET    | `/scan/{id}/progress` | SSE stream for live progress  |
| GET    | `/scans/{id}`         | Fetch completed tracklist     |

SSE progress events:

```json
{ "chunk": 12, "total": 48, "status": "identifying" }
```

Always use `src/api/client.ts` for all API calls — never fetch directly from components.

---

## Manifest V3 notes

- Use `chrome.runtime` for Chrome, `browser.runtime` for Firefox — abstract behind a thin wrapper using `webextension-polyfill`
- Background runs as a **service worker** — stateless, can be killed at any time, never store state in memory, always use `chrome.storage`
- SSE must be handled in the background service worker, not the content script
- Permissions needed: `activeTab`, `scripting`, `storage`
- Host permissions needed: `https://soundcloud.com/*`

---

## Firefox compatibility

- Use `webextension-polyfill` to smooth over `chrome` vs `browser` API differences
- Test in Firefox regularly, not just at the end
- Add `browser_specific_settings` to manifest for Firefox:

```json
"browser_specific_settings": {
  "gecko": {
    "id": "2ez-digging@ozelot.studio",
    "strict_min_version": "109.0"
  }
}
```

---

## Conventions

- CSS Modules only — no Tailwind, no inline styles, but RadixUI could be a choice if needed
- Injected UI must feel native to SoundCloud — match its dark color scheme
- No component does its own API calls — all calls go through background worker via messaging
- TypeScript strict mode — no `any`

---

## Running locally (Chrome)

```bash
bun dev
```

1. Go to `chrome://extensions`
2. Enable Developer Mode
3. Click "Load unpacked" → select the `dist/` folder

## Running locally (Firefox)

```bash
bun dev
```

1. Go to `about:debugging`
2. Click "This Firefox" → "Load Temporary Add-on"
3. Select `dist/manifest.json`

---

## Build phases

- [ ] Phase 1 — Manifest V3 scaffold + Vite build setup for Chrome
- [ ] Phase 2 — Toolbar icon with grey/coloured auth state variants
- [ ] Phase 3 — Content script detecting SoundCloud mix pages + injecting scan button
- [ ] Phase 4 — Auth state management in background worker + button reflects login status
- [ ] Phase 5 — Background worker + POST /scan + SSE progress forwarding
- [ ] Phase 6 — Inline progress display + tracklist on scan completion
- [ ] Phase 7 — Firefox compatibility pass
- [ ] Phase 8 — Safari (future, out of scope for now)
