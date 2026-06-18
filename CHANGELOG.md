/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
# Changelog

## 0.1.1

### CMS Styles
- **Kebab-case style names.** Bumped `@selfhelp/shared` to `^1.8.0`, which renamed
  the CMS `style_name` discriminator from camelCase to kebab-case, and updated the
  `styleImpls` registry keys to match: `entryList`→`entry-list`,
  `entryRecord`→`entry-record`, `entryRecordDelete`→`entry-record-delete`,
  `resetPassword`→`reset-password`, `twoFactorAuth`→`two-factor-auth`. The backend
  now serves these kebab-case names; an older mobile build would render these
  styles as Unknown, so this must ship in lockstep with backend `>=0.1.14`.
  (`components/styles/index.ts`)

### Tooling / Lint
- **Lint is now a blocking CI gate.** `plugin-mobile-check.yml` runs
  `npm run lint -- --max-warnings=0` (after the license-header check, before the
  type-check). The strict, type-aware Expo flat config already existed but was
  not enforced by any workflow.
- Made `npm run lint -- --max-warnings=0` pass deterministically by turning off
  the noisy `import/no-named-as-default-member` rule in `eslint.config.js` (with
  an inline reason). It only false-positived on the documented idiomatic APIs of
  default-export libraries that also publish same-named named exports
  (`axios.create()`, `i18n.changeLanguage()`/`i18n.use()`); no application code
  or runtime behavior changed, and every correctness/type-safety rule stays on.

### Testing (ecosystem testing strategy, Slice 9)
- Added `node --test` unit suites for the renderer helpers under
  `__tests__/unit/`: the CMS field readers (`readField`,
  `readStringField`, `readBooleanField`, `readNumberField`),
  `useInterpolatedField`, `buildSectionClasses`, and the css_mobile
  classifier (`cssMobileToUniwind`).
- Added the `__tests__/support/renderMobile.ts` `renderHook` harness
  (a `react-dom/server` probe — no DOM, no `react-test-renderer`) and
  `__tests__/support/{register,loader}.mjs`, which let `.test.mjs` import
  the app's `.ts` helpers directly (Node 22 type-stripping + tsconfig
  alias / extensionless resolution + the RN `__DEV__` global).
- Added the release-tier Maestro golden flow
  `e2e/golden/form-action-job.yaml` (mobile twin of the backend
  form→action→job chain) and the `test:renderer` + `test:e2e` npm
  scripts. `plugin-mobile-check.yml` now runs the renderer-helper tests.
- Pinned the `plugin-mobile-check.yml` gate to `mobile-parity` (both the job id
  AND the job `name:`) so the GitHub check run is literally `mobile-parity`,
  matching the canonical branch-protection required check documented in the
  backend testing guidelines. GitHub derives the required-check name from the
  job `name:` (falling back to the job id), so the descriptive name was replaced
  with `mobile-parity` to keep the required check stable and existent.
- Added `@types/react-dom` (devDependency) to type the `react-dom/server`
  render harness.

### Plugin runtime
- Added `hooks/usePluginRealtime.ts`, a thin mobile wrapper around the
  shared `usePluginRealtime` hook from `@selfhelp/shared/plugin-sdk`.
  It injects a `react-native-sse`-backed transport on iOS/Android (with
  the bearer token from the auth store) and falls back to the browser
  `EventSource` on web. Plugins running on mobile can import this
  module instead of the shared package and stay agnostic of platform
  differences.
- Bumped `@selfhelp/shared` to `^1.0.4` so the new realtime hook + the
  aligned `IPluginRegistry` / `IPluginLock` types are available on
  mobile.

## 0.1.0

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
- Created the first reusable style library for:
  auth screens (`Login`, `Profile`, `Register`, `ResetPassword`, `TwoFactorAuth`, `Validate`),
  layout blocks (`Box`, `Card`, `Container`, `Flex`, `Grid`, `Paper`, `ScrollArea`, `Stack`, `SimpleGrid`, `Space`, `Divider`, `Center`, `Group`, `AspectRatio`, `BackgroundImage`),
  interactive UI (`Button`, `Link`, `ActionIcon`, `Alert`, `Avatar`, `Badge`, `Chip`, `Indicator`, `Notification`, `ThemeIcon`),
  typography (`Title`, `TextStyle`, `Typography`, `Blockquote`, `Code`, `Fieldset`, `Highlight`, `HtmlTag`, `Kbd`, `Spoiler`),
  media (`Figure`, `ImageStyle`, `VideoStyle`, `AudioStyle`, `Carousel`),
  composite content (`Accordion`, `AccordionItem`, `Tabs`, `Tab`, `Timeline`, `EntryList`, `EntryRecord`, `EntryRecordDelete`, `Loop`, `ListItem`, `ListStyle`),
  and forms (`TextInput`, `Input`, `Textarea`, `Checkbox`, `Switch`, `Radio`, `Select`, `Combobox`, `DatePicker`, `NumberInput`, `ColorInput`, `ColorPicker`, `RangeSlider`, `Slider`, `Rating`, `SegmentedControl`, `Progress`, `ProgressRoot`, `ProgressSection`, `FileInput`, `RichTextEditorReadOnly`, `FormUserInput`).
- Introduced the phone preview frame for the web version so editors can see a mobile-like layout in the browser.
- Added loading, error, and debug surfaces to make the app easier to use and review during development.

### Platforms and builds
- Prepared the project for iOS, Android, and web preview.
- Added local run scripts plus build/update commands for development, preview, and production flows.
- Added instance/build configuration so different environments can point to different backends cleanly.
- Added clearer setup notes for Expo Go testing, including local-network backend access, Apache LAN access, and Symfony trusted-host configuration.

### Session and backend connection
- Added login, logout, refresh-token restore, and session bootstrap so users can come back after reload.
- Improved how the app remembers the selected backend in preview/dev mode.
- Added safer server switching so changing backend clears the old session and reloads the app state cleanly.

### Live updates
- Added live ACL/session update support so app permissions and menus can refresh when backend access changes.
- Split the live update path by platform:
  native apps use direct authenticated subscriptions, while web preview uses browser-friendly cookie-based subscriptions.
- Improved refresh and remount handling to reduce stuck startup loops during browser reloads.
