/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
# Development

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
| `npm run build:*`           | EAS Build wrappers (see [builds.md](builds.md)). |
| `npm run update:*`          | EAS Update wrappers (OTA). |

## Fast refresh + Reanimated

Fast refresh is on by default. If a Reanimated worklet starts behaving oddly, hit `r` in the Metro CLI to reload, or shake the device for the dev menu.

## Debugging

- `console.log` shows up in Metro's terminal.
- React DevTools: `npx react-devtools` after `npm run start`.
- Network: `npx flipper` (Android) or Safari Web Inspector (iOS, macOS).
- Sentry-style errors: not wired in v1; see [best-practices.md](best-practices.md) for what to add when traffic warrants it.
- `DebugWrapper` (auto, `__DEV__` only) — set `debug=1` on a CMS section and the renderer wraps it with a dashed border and a footer that prints the section's condition outcome and applied `css_mobile` classes. Useful for hunting why a section doesn't show up or why a Tailwind class isn't being honoured.

## Web preview parity (HeroUI Native)

Web preview is a development-only target. **HeroUI Native is not mounted on web** — `ThemeProvider` returns its children directly when `Platform.OS === 'web'` because HeroUI Native uses native-only primitives (gesture handler context, reanimated worklets, native StyleSheet runners) that either fail or render incorrectly under React Native Web.

Implications:
- Layout/typography/forms render via Uniwind classes only on web. Components that rely on HeroUI Native's runtime context (e.g. its `Sheet`, `BottomSheet`) won't behave identically — verify those on a real iOS / Android build before shipping.
- The "good enough" rule of thumb: if it looks right on web preview, it'll look right on device. If it looks broken on web preview, run `npm run android` / `npm run ios` before assuming the bug is real.

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
- Render children with the `<Children>` component, never `section.children.map(...)` — `<Children>` evaluates conditions and runs interpolation in one place.

## Frequently used shortcuts

- Reload bundle: `r` in Metro, `Cmd+R` in iOS sim, `R R` on Android.
- Toggle inspector: `Cmd+D` (iOS), `Cmd+M` (Android emulator), or shake real device.
- Reset state: clear app data (Android Settings → Apps → SelfHelp → Storage; iOS Simulator → Device → Erase All Content and Settings).
