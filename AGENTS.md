# AGENTS.md

Before returning anything print in chat `❤️AGENTS.md` so that we know the rules are used

## Project Overview

This repository is the SelfHelp mobile frontend app. It displays end-user pages and forms that were already configured in the SelfHelp CMS/web system. Mobile users cannot create, configure, edit, or administer CMS pages from this app; all CMS authoring and configuration happens in the web/admin side of the SelfHelp system. The app talks to a Symfony backend through `/cms-api/v1/*`, fetches page payloads by CMS keyword, and relies on `@selfhelp/shared` for shared API endpoints, DTOs, CMS style types, registry keys, Tailwind/Mantine tokens, condition evaluation, and class allow-listing.

## Tech Stack

- Expo SDK 55, React 19, React Native 0.83, Expo Router.
- TypeScript strict mode with path aliases from `tsconfig.json`.
- HeroUI Native, Uniwind, Tailwind v4, shared design tokens from `@selfhelp/shared`.
- TanStack Query v5 with AsyncStorage persistence on native.
- Zustand stores for auth, server URL, language, and dev preview mode.
- Axios for HTTP, through the shared `getApiClient()` singleton.
- i18next / react-i18next for local UI strings and language state.
- react-hook-form and zod only for known static forms; CMS forms use dynamic local context.
- Expo modules for secure storage, notifications, camera/media permissions, deep links, OTA updates, audio, image/video.
- npm with `package-lock.json`. Do not introduce Yarn or pnpm.

## Repository Structure

- `app/`: Expo Router routes. `(app)` is the drawer-based authenticated shell, `(public)` contains login, `(dev)` contains the server picker.
- `components/renderer/`: presentation renderer for CMS page payloads, condition handling, interpolation, debug wrapper, style dispatcher, child rendering helpers.
- `components/styles/`: mobile presentation implementations for CMS style payloads, grouped by layout, typography, media, interactive, forms, composite, and auth.
- `components/shell/`: navigation header, drawer, bottom tabs, page-list helpers.
- `components/feedback/`: loading and error screens.
- `providers/`: root provider stack for error boundary, server hydration, query client, i18n, theme, auth bootstrap, session sync, and native side effects.
- `services/`: API client and typed service wrappers for auth, pages, forms, language, session, server selection, storage, and query client.
- `stores/`: Zustand stores.
- `hooks/`: TanStack Query hooks and reusable app hooks.
- `styles/`: `css_mobile` to Uniwind pipeline and Mantine token mappers.
- `native/`: native integrations for permissions, notifications, deep links, OTA, audio, and device registration.
- `config/`: runtime config and dev server presets.
- `docs/`: architecture, setup, development, builds, styling docs, and cookbooks.
- `scripts/`: EAS instance helper scripts.
- `__tests__/`: Node test suite, currently registry parity tests.

## Architecture Rules

- Keep the root provider order from `providers/AppProviders.tsx`: `ErrorBoundary -> ServerProvider -> QueryProvider -> I18nProvider -> ThemeProvider -> AuthProvider -> SessionSyncProvider -> NativeBootstrap -> children`.
- Do not start CMS page/menu queries until server hydration and auth bootstrap are complete.
- Use Expo Router file routes. CMS pages are fetched by keyword: `home`, `menu`, `profile`, or dynamic `/<keyword>`.
- Treat this app as a mobile frontend for existing CMS content, not as a CMS editor/admin. Page creation, page configuration, style setup, and content authoring belong to the web/admin/backend side.
- User form submissions are end-user data entry, not CMS page/content creation.
- Dev/preview builds can switch backend servers at runtime. Production instance builds use the baked backend URL from Expo config.
- Server switch and logout must clear auth state and auth-scoped query data.
- The renderer pipeline is: condition evaluation for `platform: mobile`, interpolation, `css_mobile` allow-list/remap, Mantine token mapping, then dispatch through `styleImpls`.
- All CMS style implementations must be registered in `components/styles/index.ts`.
- Render CMS children through `<Children>`, not by directly mapping `section.children`.
- Unknown styles should fall back safely through `UnknownStyle`.

## Component Design Rules

- Prefer small, focused components instead of large multi-purpose files.
- Keep CMS style components focused on displaying one CMS style payload.
- Split components when a file starts mixing rendering, API calls, formatting, field parsing, permissions, validation, and native side effects.
- Separate responsibilities:
  - data fetching into `services/` and `hooks/`
  - CMS field parsing into renderer helpers
  - layout/rendering into components
  - native side effects into `native/`
  - reusable state into `stores/`
- Reuse renderer helpers before creating new CMS parsing logic.
- Extract repeated logic into hooks or utilities only when it is used more than once or clearly improves readability.
- Do not over-abstract too early. Small local duplication is better than a confusing generic abstraction.
- Prefer composition over large prop-heavy components.
- Keep props typed with clear interfaces.
- If a component grows too large, first extract named subcomponents, hooks, styles, and types in the same folder before creating global shared abstractions.
- Move UI pieces to shared folders only when they are actually reused or clearly domain-independent.
- Reusable components should not depend on one specific screen unless intentionally scoped.

## Coding Style

- Use TypeScript. Keep strict typing working with `npm run typecheck`.
- Use 4-space indentation, semicolons, single quotes, named exports, and existing path aliases such as `@/services/...`.
- Interfaces are commonly prefixed with `I`; type aliases are commonly prefixed with `T`.
- New TS/TSX/JS files should include the two-line MPL-2.0 SPDX header from `header.txt`.
- Use `readField`, `readStringField`, `readBooleanField`, `readNumberField`, and `useInterpolatedField` from `components/renderer/useField.ts`. Do not read `section.fields[...]` directly.
- Use `buildSectionClasses(section)` for CMS style class names.
- Mobile reads `css_mobile`, never `css`.
- For non-trivial style components, use the 4-file pattern: `Component.tsx`, `Component.styles.ts`, `Component.types.ts`, optional `Component.hooks.ts`, and `index.ts`.
- Keep `*.styles.ts` files to constants and `StyleSheet` objects. Do not put business logic there.
- Small style components may stay single-file.
- Use `debugLogger` or dev-gated logging. Do not add `console.log`; lint warns on it.

## Accessibility Rules

- Treat accessibility as a default requirement for every screen, CMS style component, form, and interactive element, not as a later enhancement.
- Prefer native React Native controls and HeroUI Native primitives when they provide better built-in accessibility behavior.
- Every interactive element must have an appropriate accessibility role, readable label, and state when relevant, such as selected, checked, disabled, expanded, or busy.
- Do not rely on color, opacity, icon-only UI, or motion alone to communicate meaning, validation state, status, or required actions.
- All tappable controls must have a sufficiently large touch target. If the visual control is small, expand the hit area with `hitSlop` or layout spacing.
- Images and non-text media that convey meaning must have accessible labels or text alternatives. Decorative media should be hidden from assistive technology when appropriate.
- Inputs must expose clear labels, required state, current value where useful, and validation errors in a way that screen readers can understand.
- When showing validation, submission, loading, success, or error states, make sure the change is announced or otherwise exposed accessibly instead of only changing visuals.
- Preserve logical reading and focus order. Do not create layouts that visually reorder content in a way that becomes confusing for screen readers or keyboard users.
- After navigation, modal open/close, or major dynamic content changes, ensure focus lands somewhere sensible for keyboard and assistive technology users.
- Support dynamic type and font scaling. Do not block text scaling unless there is a documented product reason and an explicit review.
- Keep text contrast and interactive-state contrast high enough to remain readable in real mobile conditions, including low brightness and outdoor use.
- Avoid flashing, rapid repeated animation, or motion-heavy interactions that can create accessibility or vestibular issues. Respect reduced-motion preferences when feasible.
- For CMS-rendered content, preserve accessibility metadata during field parsing and style dispatch. Do not strip meaningful labels, headings, helper text, or semantic intent from payloads.
- Use headings, grouped sections, and descriptive button/link text so screen-reader users can understand structure without reading every node in order.
- Do not use placeholder text as the only label or instruction for a field.
- Test both authenticated and public flows with screen-reader and keyboard-style navigation in mind when changing navigation, forms, or renderer behavior.

## Engineering Principles

- Think before coding. State assumptions explicitly when they affect implementation or verification.
- If multiple interpretations are plausible, prefer the simplest one and mention the alternative briefly when it matters.
- Ask questions only when ambiguity materially changes the implementation or carries real risk.
- Prefer the simplest correct solution. Push back on unnecessary complexity, configurability, or abstraction.
- Implement only what was requested. Avoid speculative helpers, options, and edge-case handling unless there is a realistic need.
- Make surgical changes: change only what is needed, match the surrounding style, and do not refactor unrelated code.
- Remove code only when your change makes it clearly unused.
- Establish success criteria before changing code and verify against them before stopping.
- For bug fixes: reproduce the issue, identify the minimal cause, implement the smallest reasonable fix, verify it, then stop.
- For features: define success criteria, implement the minimal solution, verify behavior, then stop.

## AI Agent Rules

- Inspect nearby code, docs, and existing patterns before changing files.
- Keep changes small and focused. Do not rewrite renderer, auth bootstrap, provider order, or query-key structure unless the task explicitly requires it.
- Do not introduce new dependencies without a clear reason and package/config updates.
- Do not duplicate types, endpoints, tokens, or registry definitions that belong in `@selfhelp/shared`.
- Do not change public API endpoints, shared DTOs, CMS style names, or EAS build profiles without documenting impact.
- Do not add CMS authoring, editing, or administration flows to the mobile app unless the product direction explicitly changes.
- Do not expose or print secrets. Do not read or copy `.env` values into documentation.
- Preserve user changes in the worktree. Do not revert unrelated edits.
- Update docs and tests when changing architecture, commands, renderer behavior, API contracts, or build flow.
- Run the relevant checks before handing off: usually `npm run typecheck`, `npm run lint`, and `npm test`.

## Multi-Repository Changes

- Read the `AGENTS.md` of every affected repository before making changes.
- Follow repository-specific rules even when they differ between repositories.
- Keep changes isolated to the repository being modified.
- Do not apply conventions from one repository to another unless that convention is explicitly documented there.

## Security Rules

- Use `secureStore` for persisted app credentials and settings. Do not access `localStorage` or AsyncStorage directly for auth/session data.
- Refresh tokens are persisted under `SECURE_STORE_KEYS.REFRESH_TOKEN`.
- Access tokens live in Zustand during runtime. The current code can also persist a short-lived auth-session snapshot through `services/authSessionPersistence.ts`; do not store access tokens anywhere else.
- All normal backend calls must use `getApiClient()` so `baseURL`, `Authorization`, `Accept-Language`, and `X-Client-Type: mobile` are applied.
- Login, logout, and refresh use raw axios only where the current services intentionally avoid interceptor loops.
- All refresh-token exchanges must go through `refreshAccessToken()` in `services/tokenRefreshService.ts`.
- Do not race refresh calls. The singleton exists because the backend rotates refresh tokens.
- Guard native camera, microphone, image picker, and media-library access through `native/permissions.ts`.
- Keep secret files ignored: `.env`, `.env.local`, signing keys, mobile provisioning files, and `secrets/`.

## API Rules

- The mobile app talks to the Symfony backend through `/cms-api/v1/*`.
- Prefer endpoint constants and DTOs from `@selfhelp/shared`; do not hardcode backend paths unless the shared package does not expose an endpoint yet.
- API responses use envelope shapes with `data`, `error`, and sometimes `field_errors`.
- Service wrappers should return normalized app data or typed result unions such as `{ kind: 'ok' | 'validation' | 'error' }`.
- Page queries include server URL, keyword, language, preview mode, and auth scope in their query keys.
- Pages are fetched by keyword using `ENDPOINTS.PAGES.BY_KEYWORD(keyword)`.
- Page lists are normalized with `transformPagesData` because the backend returns snake_case fields.
- Form validation errors from the backend are mapped into per-field error maps.
- On native, Mercure ACL updates use `react-native-sse` with bearer headers. On web preview, current code requests cookie transport and uses browser `EventSource` with credentials.

## Database Rules

- This mobile repo has no local database, migrations, entities, repositories, or fixtures.
- Backend database and CMS style migrations live outside this repo.
- If a new CMS style requires backend support, add it in the backend using the SelfHelp migration helpers documented in `docs/cookbook/add-style.md`.
- Do not add a local database layer to this app without an explicit architectural decision.

## Testing Rules

- `npm test` runs Node's built-in test runner over `__tests__/**/*.test.mjs`.
- The current test suite checks parity between the shared style registry and mobile `styleImpls`.
- `npm run typecheck` runs `tsc --noEmit`.
- `npm run lint` runs ESLint flat config. Existing warnings are present; do not add new warnings.
- Add or update tests when changing registry behavior, scripts, shared-contract handling, or parsing/normalization logic.
- For UI and renderer changes, smoke test with `npm run web`; verify native-only behavior on Android or iOS when it involves push, camera, audio, permissions, or HeroUI Native primitives.
- For accessibility-sensitive UI changes, verify labels, roles, focus order, dynamic type, contrast, and error messaging with screen-reader-friendly flows on device or emulator when practical.

## Build / Dev Commands

- `npm install`: install dependencies.
- `npm run start`: start Expo.
- `npm run start:clean`: start Expo with cache clear.
- `npm run web`: start Expo Web preview.
- `npm run android`: run Android dev build.
- `npm run ios`: run iOS dev build.
- `npm run typecheck`: TypeScript check.
- `npm run lint`: ESLint check.
- `npm run lint:fix`: ESLint auto-fix.
- `npm test`: run Node tests.
- `npm run web:build`: export web preview.
- `npm run build:dev:android`, `npm run build:preview:android`, `npm run build:dev:ios`, `npm run build:preview:ios`: EAS build wrappers.
- `npm run instance:add`: scaffold a production instance profile.
- `npm run instance:validate -- production-<slug>`: validate an instance profile.
- `npm run headers:check`, `npm run headers:add`, `npm run headers:remove`: SPDX header maintenance.

## Common Tasks

### Add Mobile Display Support for a CMS Style

1. Add or update the style type and registry entry in `@selfhelp/shared`.
2. Build or update the shared package according to the current team workflow.
3. Implement the mobile component under `components/styles/<group>/`.
4. Use field helpers from `components/renderer/useField.ts`.
5. Use `<Children>` for child sections.
6. Register the implementation in `components/styles/index.ts`.
7. Update the web renderer too if the shared registry requires parity.
8. Run `npm run typecheck`, `npm run lint`, and `npm test`.
9. Keep the style component small. If it needs complex behavior, split it into local subcomponents, hooks, styles, and types using the 4-file pattern.
10. Reuse existing renderer helpers before creating new parsing logic.
11. Do not add CMS page/style authoring UI here. Mobile only displays and interacts with CMS payloads created elsewhere.

### Add an API Request

1. Add endpoint constants and request/response DTOs in `@selfhelp/shared`.
2. Add a thin mobile service wrapper in `services/`.
3. Use `getApiClient()` for authenticated/backend calls.
4. Add a TanStack Query hook under `hooks/` when the data is screen or component state.
5. Include server URL, language, preview mode, and auth scope in query keys when relevant.

### Add a Non-style Component

- Put shell/navigation components in `components/shell/`.
- Put loading/error/empty states in `components/feedback/`.
- Put renderer infrastructure in `components/renderer/`.
- Do not put non-style components under `components/styles/`.

### Add a Production Instance

1. Use `npm run instance:add -- <slug> "<Pretty Name>" <backendUrl> [universalLinkDomain]`.
2. Fill the generated EAS submit credentials.
3. Store Play service account JSON under `secrets/`, which is ignored.
4. Validate with `npm run instance:validate -- production-<slug>`.
5. Follow `docs/cookbook/add-instance.md`.

## Do Not Do

- Do not instantiate ad hoc axios clients for normal backend calls.
- Do not bypass `refreshAccessToken()` for token refresh.
- Do not read `section.fields` directly.
- Do not render CMS children with `section.children.map(...)`.
- Do not use the web `css` field on mobile.
- Do not bypass the shared CMS class allow-list.
- Do not build CMS page builders, CMS configuration screens, or CMS content editing tools in this mobile app.
- Do not persist secrets outside `secureStore`.
- Do not add native modules without updating Expo config and checking build impact.
- Do not change provider order or auth bootstrap timing casually.
- Do not change public routes, shared endpoints, or style names without documenting downstream impact.
- Do not rely on Expo Web preview alone for native-only features.
- Do not create huge components that handle rendering, API calls, state, validation, and side effects together.
- Do not move code to shared folders unless it is actually reused or clearly domain-independent.
- Do not create generic abstractions that make CMS style rendering harder to understand.
- Do not ship interactive UI without accessibility labels, roles, and state when those semantics are required.
- Do not use color alone to show errors, success, selection, or importance.
- Do not hide important instructions or validation details inside placeholders only.
