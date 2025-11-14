## Purpose
This file gives concise, repository-specific guidance for automated coding agents (Copilot-style) to be immediately productive in this project.

## Quick start (commands)
- Run dev server (serves the React app in `web/`):
  - npm run dev (from repository root) — uses `web/vite.config.js` with --host
- Build production web bundle:
  - npm run build (from repo root). Output goes to `assets/res/www/web` (see `vite.config.js`).
- Project sync for native packaging:
  - npm run sync (invokes `morpheus sync`) — used by mobile packaging and postinstall.

## Big-picture architecture
- Single-page React app under `web/` (Vite + React). The app is mounted in `web/src/main.jsx` and routes are in `web/src/App.jsx`.
- UI state/auth is centralized in `web/src/context/AuthContext.jsx` (token stored in localStorage). Use the `useAuth()` hook to access `user`, `login`, and `logout`.
- API layer: `web/src/api/*` contains the thin API adapters. Currently `web/src/api/auth.js` returns a dummy `getMe()` (local stub) — be aware real backend calls were previously present but replaced with a dummy for local dev.
- Build outputs are intentionally placed for the Morpheus packaging workflow: `vite.config.js` sets root to `web` and `build.outDir` to `../assets/res/www/web` so the mobile packaging pipeline picks up the web assets.

## Important conventions & gotchas (project-specific)
- Local dev runs the web app from `web/` via Vite (`root: "web"`) — don't change that without updating `package.json` scripts.
- Token and auth flow:
  - `AuthContext.login(token)` stores `token` in localStorage, then calls `getMe(token)` from `web/src/api/auth.js` to populate the `user` object.
  - Many UI files assume `user` has fields like `nickname` and `profile_image` (see `web/src/pages/main.jsx`).
  - Note: `web/src/pages/login.jsx` still posts directly to `http://localhost:5000/api/auth/login` — but `getMe()` is currently a local stub. If integrating a backend, update `web/src/api/auth.js` and switch `Login` to call the shared API module.
- Static asset paths: components reference `/images/<file>` (e.g., `Main` uses `/images/${user.profile_image}`). After build, confirm image placement under `assets/res/www/web/images` or adjust references.
- Local morpheus packages: many runtime deps are packaged in `.morpheus/libs/*.tgz` and referenced in `package.json` via file: paths — the environment expects these local tgz packages to exist for full runtime.

## Files to inspect when working on features or bugs
- `web/src/App.jsx` — routing and route guards (uses `Navigate` from react-router).
- `web/src/context/AuthContext.jsx` — auth state, localStorage token handling, `useAuth()` hook.
- `web/src/api/auth.js` — current auth adapter (dummy `getMe`) — swap in real calls here when hooking up backend.
- `web/vite.config.js` — Vite root, alias (`@` => `web/src`), build output path, and dev proxy config (proxy `/file` → `http://127.0.0.1:3000`).
- `package.json` (repo root) — scripts: `dev`, `build`, `preview`, `lint`, `sync`, `postinstall`.

## Example tasks and how to approach them
- Add a new protected page: add component to `web/src/pages/`, add `<Route path="/foo" element={user ? <Foo/> : <Navigate to="/"/>} />` in `App.jsx`.
- Replace dummy API with real backend:
  1. Implement HTTP calls in `web/src/api/auth.js` (use axios or fetch consistently).
  2. Update `web/src/pages/login.jsx` to call the exported login helper instead of hard-coded fetch.
  3. Ensure `AuthContext.login()` stores token and calls `getMe()` to hydrate `user`.

## Testing & linting
- Lint: npm run lint (root) uses `web/eslint.config.js`.
- No automated tests detected in `web/` — if adding tests follow the Vite + React test patterns and place them near code under `web/src`.

If anything here is unclear or you'd like more detail (e.g., where images are produced during the native build, or how morpheus packaging works), tell me which area to expand and I'll update this file.
