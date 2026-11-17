/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
# Development

Audience: Developers and technical operators.
Status: active.
Applies to: SelfHelp2 mobile app (sh-selfhelp_mobile).
Last verified: 2026-11-14.
Source of truth: Runtime code, configuration, and tests in this repository.

Day-to-day workflow for working on the mobile app.

## npm scripts

| Script | Purpose |
| ------ | ------- |
| `npm run start`             | Start Expo dev server (DevTools UI). |
| `npm run start:clean`       | Same as above with `--clear` to invalidate caches. |
| `npm run web`               | Start with Web target opened automatically. |
| `npm run android`           | Build + launch on Android device/emulator. |
| `npm run ios`               | Build + launch on iOS Simulator. |
| `npm run typecheck`         | Run `tsc --noEmit` against the whole app. |
| `npm run lint` / `lint:fix` | ESLint with the Expo config. |
| `npm run web:build`         | Static export of the web preview. |
| `npm run build:*`           | EAS Build wrappers (see [builds.md](../operations/builds.md)). |
| `npm run update:*`          | EAS Update wrappers (OTA). |

## Fast refresh + Reanimated

Fast refresh is on by default. If a Reanimated worklet starts behaving oddly, hit `r` in the Metro CLI to reload, or shake the device for the dev menu.

## Debugging

- `console.log` shows up in Metro's terminal.
- React DevTools: `npx react-devtools` after `npm run start`.
- Network: `npx flipper` (Android) or Safari Web Inspector (iOS, macOS).
- Sentry-style errors: not wired in v1; see [best-practices.md](./best-practices.md) for what to add when traffic warrants it.
- `DebugWrapper` (auto, `__DEV__` only) — set `debug=1` on a CMS section and the renderer adds a bug badge. Tapping it opens a themed modal with the condition outcome the server reported (`condition_debug`), applied `css_mobile` classes, a filterable field list, and the **raw section as a collapsible JSON tree** (`components/dev/JsonTree.tsx` — tap any object/array node to expand, primitives are colour-coded by type). Mirrors the web frontend's section inspector. Useful for hunting why a section doesn't show up or why a Tailwind class isn't being honoured.

## Native end-to-end flows (Maestro)

`e2e/golden/*.yaml` are [Maestro](https://maestro.mobile.dev) flows of the release tier (`npm run test:e2e` is `maestro test e2e`). They need a native target, a prepared QA backend (`composer test:reset-db` seeds the fixtures, among them the pages `qa-entries` and `qa-events` of `form-list.yaml`) and are not part of `plugin-mobile-check.yml`.

- **Name the device**: `maestro --device <id> test ...`. `adb devices` also lists a physical phone when one is plugged in; never run a flow without `--device`.
- **Parameters**: pass them with `-e`. Maestro lets the `env:` block of a flow win over `-e`, so that block holds constants only; a parameter that has a default gets it from a script step (see the header of the flow).
- **Against a build** (`com.selfhelp.dev`; the flow clears the app's state): `maestro --device <id> test e2e/golden/form-list.yaml -e APP_ID=com.selfhelp.dev -e QA_PASSWORD=<password> -e QA_SERVER_URL=<backend url>`.
- **Inside Expo Go on an Android emulator** (`APP_ID=host.exp.exponent`): start Metro with `npx expo start --offline --port <p>` (online mode asks for an Expo login; without `--localhost`, so that it listens on IPv4 and `adb reverse` reaches it), then `adb -s <id> reverse tcp:<p> tcp:<p>` and the same for the backend port, and pass `-e EXPO_GO_URL=exp://127.0.0.1:<p>` and `-e LINK_BASE=exp://127.0.0.1:<p>/--/` besides the parameters above (the flow then opens the project in Expo Go instead of clearing the state, and deep links go through Expo Go). `QA_SERVER_URL` is typed into the server picker's custom URL field; use `http://localhost:<backend port>`, which the reverse forwards.
- **Expo Go on Android cannot start the app as it is**: the app imports `expo-notifications` at startup (`native/notifications.ts`), and that module throws on import in Expo Go for Android (remote push is not available there). A development build does not have the problem. For a one-off run in Expo Go, replace `node_modules/expo-notifications/build/index.js` with a stub that exports no-op versions of the functions the app calls, keep the original, and restore it afterwards; nothing of that is in the repository.
- **Not automated**: the stale-save conflict (it needs a second client) and the file upload (the system photo picker, `expo-image-picker`, is outside the app; it grants access to the picked photo only, so there is nothing to grant or to revoke in the Android settings from version 14 on). Check them by hand: put two pictures in `/sdcard/Pictures` with `adb push` (on Windows with Git Bash set `MSYS_NO_PATHCONV=1`), pick one, save, and compare the hash of the stored file with the source; change the entry and compare the history: the file of the earlier version opens through the share sheet.

## Web preview parity (HeroUI Native)

Web preview is a development-only target. **HeroUI Native is mounted on web too** — `ThemeProvider` wraps every platform in `HeroUINativeProvider` (inside `GestureHandlerRootView`). Everything HeroUI relies on (its animation-settings/text/toast contexts, the `useSyncExternalStore` portal host, `useReducedMotion`) runs under React Native Web, so style components render their real HeroUI presentation in the browser instead of a stripped-down RN fallback. Mounting the provider is also required for correctness: HeroUI reads `useGlobalAnimationSettings()` (created with `strict: false`, so it returns `undefined` without a provider and crashes on destructure) and the portal host that `Dialog`/`Select` render into.

Implications:
- Layout/typography/forms/interactive styles render their HeroUI presentation on web. There are currently **no native-only core styles**, so every style renders in web preview today. The `WebPreviewUnsupported` component (`components/feedback/WebPreviewUnsupported.tsx`) is kept ready but **not yet wired** for the future capabilities with no web equivalent (biometrics, camera/media capture, secure hardware): when the first such native-only style ships, its renderer should show that notice on web instead of faking a broken render.
- The "good enough" rule of thumb: if it looks right on web preview, it'll look right on device. If it looks broken on web preview, run `npm run android` / `npm run ios` before assuming the bug is real. Anything touching native-only hardware must still be verified on a real iOS / Android build before shipping.

### Device frame controls

The Expo Web preview includes a dev-only device frame so we can QA layouts inside a fixed viewport instead of the full browser window.

- Open the floating `D` button and switch to the `Server` tab.
- `Device frame (web preview)` turns clipping on or off.
- `Device` switches between `Phone` and `Tablet`.
- `Orientation` switches between `Portrait` and `Landscape`.

Behavior:
- The frame is injected with CSS only on web; native builds are unaffected.
- The app root and web portal siblings share the same clipped viewport so dialogs, bottom sheets, and overlays inherit the selected device size.
- Tablet portrait keeps the tablet aspect ratio but uses a slightly smaller visual width cap on desktop so it stays comfortable to inspect.

## Theme, account sheet, and app chrome

Colour scheme is a three-way choice (`light` / `dark` / `auto`) mirroring the web frontend's `ThemeToggle`, defaulting to `auto` (follow the OS).

- `stores/themeStore.ts` holds the choice and persists it via `secureStore` (`SECURE_STORE_KEYS.THEME_MODE`). Persistence is hand-rolled for the same reason as `devModeStore` (the zustand `persist` middleware ships `import.meta.env` checks Metro can't bundle for the web classic-script runtime).
- `providers/ThemeProvider.tsx` applies the choice to Uniwind via `Uniwind.setTheme(...)` (`auto` → Uniwind's adaptive `system`). Uniwind is the single source of truth: it flips HeroUI Native tokens and `dark:` classes. The root view is painted with the resolved background so the canvas behind every screen (and the web `<body>`) is dark in dark mode.
- App chrome painted with **inline styles** (header, drawer, bottom tabs, sheets, debug panels) reads colours from `hooks/useAppColors.ts` — a semantic palette (`background`, `surface`, `text`, `primary`, …) selected reactively from `useUniwind()`, so toggling the theme repaints everything that consumes the hook. Values track HeroUI Native's own light/dark tokens so the chrome blends with CMS-rendered HeroUI content. Reach for `useAppColors()` instead of hard-coding hex values in new chrome.

The header (`components/shell/AppHeader.tsx`) is deliberately slim: a hamburger + app name on the left, and a single account button (avatar, or a gear when signed out) on the right. The account button opens `components/shell/AccountMenu.tsx` — a bottom sheet that consolidates the appearance selector, the compact language picker (`LanguageSwitcher`), "View profile" (opens the CMS `profile` page in `ProfileModal` without navigating away), a dev-only "Switch server", and log in / log out.

## Working with the shared package

The shared package is a TypeScript-only build (`tsc`) consumed via `file:`.
- Edit a file in `sh-selfhelp_shared/src/**`.
- Run `npm run build` in that repo.
- Restart Metro (or use `start:clean`).

Schema/registry changes break web *and* mobile compilation by design — both sides re-implement the same field shape, and the type system catches drift.

## Style implementation pattern (4-file)

For non-trivial styles use the 4-file split:

```
ContainerStyle/
├── ContainerStyle.tsx        # render only
├── ContainerStyle.styles.ts  # className + StyleSheet chunks
├── ContainerStyle.types.ts   # local prop types
├── ContainerStyle.hooks.ts   # only when needed
└── index.ts
```

Trivial leaf components stay single-file (most current styles are already single-file because the body is short).

## Conventions

- ESLint + TypeScript strict are the two enforced gates. Don't suppress lints; fix them.
- Avoid native modules outside what's already declared in `app.config.ts`.
- Use `getApiClient()` rather than instantiating `axios` directly — it carries auth, refresh, and `X-Client-Type`.
- Read CMS fields via the helpers in `components/renderer/useField.ts`. They handle interpolation, type coercion, and missing-field defaults.
- Render children with the `<Children>` component, never `section.children.map(...)` — `<Children>` sends each child through `BasicStyle` (platform targeting, debug wrapper, style registry) in one place.

## Frequently used shortcuts

- Reload bundle: `r` in Metro, `Cmd+R` in iOS sim, `R R` on Android.
- Toggle inspector: `Cmd+D` (iOS), `Cmd+M` (Android emulator), or shake real device.
- Reset state: clear app data (Android Settings → Apps → SelfHelp → Storage; iOS Simulator → Device → Erase All Content and Settings).
