# Changelog

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
