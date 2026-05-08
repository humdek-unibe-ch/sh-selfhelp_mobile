# Changelog

## Unreleased

### App foundation
- Started the SelfHelp mobile app as a standalone Expo project.
- Set up the core app structure so the project can run as a mobile app and a browser preview.
- Added the main provider flow for app startup, loading state, and error handling.

### Navigation and content
- Added the main app shell with header, menu, page navigation, and profile area.
- Wired the app to load CMS-driven pages and menus from the backend.
- Added support for opening pages directly by URL, so refreshes and shared links can land on the right screen.

### Look and feel
- Added the first round of reusable styles and screen layouts.
- Introduced the phone preview frame for the web version so editors can see a mobile-like layout in the browser.
- Added loading, error, and debug surfaces to make the app easier to use and review during development.

### Platforms and builds
- Prepared the project for iOS, Android, and web preview.
- Added local run scripts plus build/update commands for development, preview, and production flows.
- Added instance/build configuration so different environments can point to different backends cleanly.

### Session and backend connection
- Added login, logout, refresh-token restore, and session bootstrap so users can come back after reload.
- Improved how the app remembers the selected backend in preview/dev mode.
- Added safer server switching so changing backend clears the old session and reloads the app state cleanly.

### Live updates
- Added live ACL/session update support so app permissions and menus can refresh when backend access changes.
- Split the live update path by platform:
  native apps use direct authenticated subscriptions, while web preview uses browser-friendly cookie-based subscriptions.
- Improved refresh and remount handling to reduce stuck startup loops during browser reloads.
