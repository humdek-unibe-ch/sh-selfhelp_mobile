/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
# Setup

End-to-end installation guide for the SelfHelp Mobile app. If you only want to run the app on web for fast iteration, jump straight to **Web preview**.

## Prerequisites

| Tool | Version | Why |
| ---- | ------- | --- |
| Node | 18 LTS or 20 LTS | Required by Expo SDK 54 and the shared package. |
| npm  | 10+ | Default with Node. We don't use Yarn / pnpm in this repo. |
| Git  | any | For cloning the sibling repos. |
| Java JDK | 17 | Android build target. |
| Android Studio | latest | Emulator + ADB. |
| Xcode | 15+ | iOS — macOS only. |
| EAS CLI | `npm i -g eas-cli` | Native cloud builds + submission. |
| Expo Go (optional) | latest | Quick smoke test on a real device. |

Windows users can skip Xcode but need `wsl` only if you want to mirror the macOS toolchain — Expo runs fine natively on Windows for Android and Web.

## Repo layout

The mobile app expects two sibling repos:

```
TPF/SelfHelp/
├── sh-selfhelp_backend/     # Symfony backend (already running locally)
├── sh-selfhelp_frontend/    # Next.js web frontend
├── sh-selfhelp_shared/      # @selfhelp/shared TypeScript package
└── sh-selfhelp_mobile/      # this repo
```

The `file:` dependency in `package.json` resolves the shared package directly from disk, so all three checkouts must live under the same parent folder.

## Install

Run the commands from inside each repository's root. The `cd` commands below assume the three SelfHelp repositories are checked out as siblings under your workspace folder; substitute your actual path if you keep them elsewhere.

```bash
cd ../sh-selfhelp_shared
npm install
npm run build

cd ../sh-selfhelp_mobile
npm install
```

Whenever you change anything inside `sh-selfhelp_shared/src/**`, rebuild it:

```bash
cd ../sh-selfhelp_shared && npm run build
```

Restart the Metro bundler afterwards so it picks up the rebuilt `dist/`.

## Environment variables

Copy `env.example` to `.env.local` and adjust:

```ini
APP_INSTANCE_SLUG=dev
APP_BACKEND_URL=https://api.selfhelp.local
APP_SCHEME=selfhelp
APP_UNIVERSAL_LINK_DOMAIN=
APP_EAS_PROJECT_ID=
APP_EAS_UPDATE_URL=
```

For dev builds you can leave `APP_BACKEND_URL` empty — the dev server picker handles backend selection at runtime. For production builds the URL is baked at build time (see [builds.md](builds.md)).

## Web preview

```bash
npm run web
```

Opens the app in your browser via Expo + React Native Web. This is the fastest way to iterate on CMS content rendering — fast refresh + DevTools work as you'd expect.

## Android

```bash
npm run android
```

Requires either:
- a connected device with USB debugging on, or
- a running Android Studio emulator.

For push notifications + camera you need a physical device or an emulator with Google Play services.

## iOS

```bash
npm run ios
```

macOS only. Opens the iOS Simulator. Camera and push require a real device + an Apple Developer account.

## Troubleshooting

- **Metro can't resolve `@selfhelp/shared`** — ensure the shared package was built (`npm run build`) and restart Metro with `npm run start:clean`.
- **Uniwind classNames not applying** — make sure `metro.config.js` includes the Uniwind transformer and that you imported `global.css` somewhere (handled in `app/_layout.tsx`).
- **JWT 401 loop on launch** — clear SecureStore: simulator menu → Erase device, then rerun.
