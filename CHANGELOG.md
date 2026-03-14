# Changelog

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
