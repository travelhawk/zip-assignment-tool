# Changelog

## 0.1.14 - 2026-03-16

- Removed the unused `APP_BASE_URL` variable from the tracked environment files.
- Documented that `NEXTAUTH_URL` is the web app base URL and `APP_WEB_URL` is only needed for Electron packaging.

## 0.1.13 - 2026-03-15

- Reworked Electron Microsoft login so the desktop app opens the real browser, then completes login inside Electron by polling the server instead of depending on the custom protocol callback.
- Persisted pending Electron login requests in SQLite so the browser handoff survives `next dev` recompiles and matches production behavior.
- Aligned Electron development URLs to `http://localhost:3000` to avoid cross-origin failures between `localhost` and `127.0.0.1`.

## 0.1.11 - 2026-03-15

- Fixed the Electron browser-based Microsoft login by starting the OAuth flow through `/electron-auth/start` instead of calling the raw provider sign-in URL directly.

## 0.1.10 - 2026-03-15

- Removed the Electron window menu bar.
- Added an Electron-only Microsoft SSO handoff that opens the system browser and returns to the desktop app through a custom protocol callback.
- Kept the normal embedded web login path available as a fallback without changing the browser app flow.

## 0.1.9 - 2026-03-14

- Enter loading state immediately when typing so the search panel no longer flashes through the transient empty-results surface during the debounce window.

## 0.1.8 - 2026-03-14

- Switched the main search panel from a translucent glass surface to a fixed solid surface so its background color stays visually constant during live updates.

## 0.1.7 - 2026-03-14

- Simplified the scrollbar stabilization to a permanent vertical scrollbar without symmetric gutter padding, keeping both the panel width and background rendering consistent during live search.

## 0.1.6 - 2026-03-14

- Forced a stable page scrollbar gutter so the centered main panel no longer changes width while search results appear or disappear.

## 0.1.5 - 2026-03-14

- Moved live search to an authenticated `/api/search` endpoint with in-place client updates.
- Kept the `q` URL parameter in sync via the native History API instead of route transitions on each keystroke.
- Added URL helper tests for live-search query normalization and URL updates.

## 0.1.4 - 2026-03-14

- Replaced the settings icon with a more standard symmetric gear.

## 0.1.3 - 2026-03-14

- Reserved scrollbar gutter space so the main panels keep a stable horizontal size when search result blocks appear or disappear.

## 0.1.2 - 2026-03-14

- Fixed the search input so late URL updates no longer remove the newest typed digit.
- Added a PM2 ecosystem file plus npm scripts for start, restart, and stop.
- Added committed project run configurations for build, PM2 start, and PM2 restart.

## 0.1.1 - 2026-03-13

- Switched Entra admin authorization from `ADMIN_EMAILS` to the Entra app-role `roles` claim.
- Kept search available to all signed-in users while restricting import UI and import routes to admins.
- Added a regression test for Entra role parsing and admin detection.
- Fixed the admin check to match Entra app role values such as `Assignment.Import`, not just the display name.
- Replaced the fixed F-key hotkey selector with automatic shortcut capture, including combinations such as `Ctrl+Alt+K`.
