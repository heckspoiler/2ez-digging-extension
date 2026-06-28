# chopd — SoundCloud Mix Scanner

> A Chrome/Firefox browser extension that scans SoundCloud mixes and identifies tracks.

Part of the **2ez-digging** project:
- **Backend:** [`2ez-digging-backend`](../..)
- **Frontend:** [`2ez-digging-frontend`](../..)

---

## What it does

When you visit a SoundCloud mix/set page, the extension injects a scan button into the page UI. Clicking it submits the mix to the backend for track identification and shows live progress via Server-Sent Events (SSE).

## Stack

- **React 19** + **TypeScript** — UI
- **Vite** + `vite-plugin-web-extension` — build tooling
- **Manifest V3** — extension format (Chrome & Firefox)
- **Bun** — package manager

---

## Project structure

```
src/
├── background/
│   └── index.ts              # service worker — API calls, scan state, auth
├── hooks/
│   ├── useAuth.ts            # auth state hook
│   └── useScanner.ts         # scanner state hook
├── lib/
│   ├── auth.ts               # auth utilities (Supabase)
│   ├── config.ts             # runtime config
│   ├── messages.ts           # extension messaging helpers
│   └── scanJob.ts            # scan job management
├── api/
│   └── client.ts             # backend API client
├── types/
│   └── index.ts              # shared type definitions
├── utils/
│   └── injectButton.ts       # content script — injects button into SoundCloud
├── App.tsx                   # extension popup UI
├── soundcloud.css            # styles for injected SoundCloud elements
└── index.css                 # global styles
```

---

## Running locally

```bash
bun install
bun dev
```

### Load in Chrome

1. Go to `chrome://extensions`
2. Enable **Developer Mode**
3. Click **Load unpacked** → select the `dist/` folder

### Load in Firefox

1. Go to `about:debugging`
2. Click **This Firefox** → **Load Temporary Add-on**
3. Select `dist/manifest.json`

---

## How it works

1. A content script injects a scan button into SoundCloud mix pages
2. Clicking the button sends the current URL to the background service worker
3. The worker POSTs to the backend `/scan` endpoint
4. The worker opens an SSE connection to `/scan/{id}/progress`
5. Progress events are forwarded to the content script and displayed inline
6. On completion, the identified tracklist is shown

---

## Auth

- Auth is handled via **Supabase** and stored in `chrome.storage.local`
- The extension popup provides login/logout functionality
- Auth state is managed in the background service worker — content scripts query state via messaging

---

## Build

```bash
bun build
```

Outputs to `dist/`.

---

## Environment

Copy `.env.example` to `.env`:

```
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```
