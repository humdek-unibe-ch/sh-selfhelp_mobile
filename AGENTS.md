/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
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
- `__tests__/`: Node test suite for registry parity, renderer helpers, style behavior, and mobile UI contracts.

## Documentation Rules

These rules apply to every documentation change in active SelfHelp2 repositories. Copy this section unchanged across repository `AGENTS.md` files so agents get the same documentation contract without following a central link.

- Organize documentation by audience and purpose, not by implementation history: `docs/developer/` for technical architecture/workflow docs, `docs/user/` for non-technical feature/admin/operator guides, `docs/reference/` for exact contracts/tables/schemas/API details, `docs/cookbook/` for task recipes, `docs/operations/` for install/deploy/publish/runbooks, and `docs/archive/` for historical notes.
- Every docs root should have `docs/README.md` as the navigation entrypoint. Tiny repos may keep documentation in the root `README.md` until they need more than one doc. Preserve canonical exceptions such as backend `docs/plugins/` when moving files would break important links; add indexes/status notes first, migrate only after references are updated.
- New or substantially rewritten docs must begin with this metadata block: `Audience`, `Status`, `Applies to`, `Last verified`, `Source of truth`.
- Documentation filenames should use lowercase kebab-case, one `#` title, ASCII punctuation, no emoji headings, repo-relative links, concrete dates instead of "latest/current" when time-sensitive, and no local absolute paths.
- Write developer docs for engineers/technical operators with architecture, contracts, commands, and tradeoffs. Write user docs for non-technical users/operators as task-based steps with expected results and minimal implementation jargon.
- Update documentation in the same change when behavior changes affect user-visible behavior, API contracts, schemas/types, permissions/auth, database/migrations, config/env vars, build/deploy/publish flow, plugin capabilities, or testing commands.
- Do not expose secrets, tokens, private keys, database URLs, Mercure/JWT secrets, or real credentials in docs, examples, logs, or screenshots. Use redacted examples and documented env var names only.
- When docs conflict with runtime behavior, treat runtime behavior as source of truth, flag the stale doc, and update or archive it instead of copying the conflict.

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

## Navigation System Rules

Mobile navigation is driven by the backend `GET /navigation` payload (typed in `@selfhelp/shared`): the app renders the `mobile_drawer` and `mobile_bottom_tabs` menus. Backend reference: `sh-selfhelp_backend/docs/developer/29-navigation-menu-builder.md`.

- **Loading:** the navigation context/hook is the single source for menus, `settings`, and `branding`. Do not fetch or reshape the payload in components.
- **Drawer:** `components/shell/CmsDrawerContent.tsx` renders the `mobile_drawer` tree recursively (`DrawerEntry`) — up to three levels, collapsible groups, per-item `mobile_icon` (Lucide names). The drawer header renders `branding` (logo via `resolveAssetUrl` + `logo_alt`, fallback text).
- **Bottom tabs:** `mobile_bottom_tabs` respects `item_limit`; group items act as holder tabs (first-child redirect / segment children).
- **Page opening rule:** a CMS page that exists in the mobile menu structure opens as a normal screen; a page NOT in any mobile menu opens as a modal. Keep this logic in the shell (it must also hold inside the web live preview, which drives this app through the preview token — the backend `MobilePreviewAccessGuard` allows `navigation_get_v1`).
- **Icons:** menu/CMS icon names may arrive as Lucide (`House`) or web Tabler (`IconCircleCheck`) names. Always resolve through `components/ui/glyphIcon.tsx` (`GLYPH_ICONS`, `resolveGlyphIcon`, `TABLER_ALIASES`) — never render raw icon-name strings; `ThemeIcon`/`ActionIcon`/`PageMenuIcon` already do this.
- **Helpers:** use the shared navigation helpers (`clampMenuItemsAtDepth`, item label/href/aria resolution, `branchNav` where applicable) instead of hand-rolling menu traversal.

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
- CMS style property fields are unprefixed when both platforms consume them (`color`, `variant`, `size`, `spacing`, etc.). Only `web_*` / `mobile_*` are platform-specific; the reserved collision exceptions are `shared_height`, `shared_width`, and `shared_icon`. Do not reintroduce general `shared_*` reads.
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

## Linting & Type Safety (Mandatory)

Linting and typechecking are mandatory whenever code changes. They are not optional polish.

- After changing any TypeScript / JavaScript / React Native / Expo code, you MUST run `npm run lint`. CI runs lint as a **blocking, zero-warning** gate (`npm run lint -- --max-warnings=0`) in `plugin-mobile-check.yml`, so the lint run must be clean of both errors AND warnings before you finish. Generated/native output (`node_modules`, `.expo`, `dist`, `web-build`, `android`, `ios`) is ignored by the flat config so the run is deterministic.
- If `npm run lint` reports problems, fix them before finishing. Do not hand off with new lint errors or warnings.
- For larger changes (multiple files, renderer/provider/service edits, type changes), also run `npm run typecheck`.
- For changes affecting navigation, Expo Router routes, auth/session logic, API calls, cache/persistence, native permissions, notifications, camera/media, or shared (`@selfhelp/shared`) types, run the relevant targeted checks/tests if available (`npm run typecheck`, `npm test`, `npm run test:renderer`).
- All lint fixes MUST be behavior-preserving. Never change runtime behavior, navigation, async flow, return values, or UI just to satisfy a lint rule.
- If a lint issue cannot be fixed without risking a behavior change, do not guess: prefer a narrow, single-line `eslint-disable-next-line <rule>` with a comment explaining why, and report it. Never add broad file-level or global rule disables to hide problems.
- Hard rules enforced by ESLint (do not regress these):
  - No unused imports.
  - No unused variables unless intentionally prefixed with `_`.
  - No explicit `any` (use `unknown`, generics, or a real type; a narrow documented exception is the only escape hatch). The `no-unsafe-*` family also blocks `any` propagation through the type system.
  - No floating promises (`no-floating-promises`) and no misused promises (`no-misused-promises`, with the documented React-friendly `checksVoidReturn.attributes: false` so `async` `onPress`/`onSubmit` handlers stay legal) — mark intentionally fire-and-forget promises with the `void` operator.
  - Consistent, side-effect-free type imports (`consistent-type-imports`) and no duplicate imports (`import/no-duplicates`).
  - React Hooks rules from `eslint-config-expo` (`react-hooks/rules-of-hooks`) — never call hooks conditionally or in loops.
- `import/no-named-as-default-member` is intentionally turned **off** in `eslint.config.js` (documented inline): it false-positives on the documented idiomatic APIs of default-export libraries that also publish same-named named exports (`axios.create()`, `i18n.changeLanguage()`/`i18n.use()`). This is a behaviour-preserving config decision, not a blanket disable to hide bugs — every correctness/type-safety rule stays enforced.
- Do not weaken `eslint.config.js` or `tsconfig.json` rules just to make checks pass. Do not introduce Next.js/browser-only rules — this is an Expo / React Native repo and the config layers on `eslint-config-expo`, not `eslint-config-next`.
- Preserve SPDX/license headers; run `npm run headers:check` if you add or move files.
- Your final response must state the exact commands you ran (`npm run lint`, `npm run typecheck`, `npm test`, …) and their results.

## Multi-Repository Changes

- Read the `AGENTS.md` of every affected repository before making changes.
- Follow repository-specific rules even when they differ between repositories.
- Keep changes isolated to the repository being modified.
- Do not apply conventions from one repository to another unless that convention is explicitly documented there.
- Plugin-related work touches this repo plus the sibling repositories `sh-selfhelp_backend`, `sh-selfhelp_frontend`, `sh-selfhelp_shared`, and the affected plugin repo under `plugins/<plugin-id>/`. The canonical Multi-Repository AGENTS.md Rule lives at `sh-selfhelp_backend/docs/plugins/multi-repo-agents-md.md`. Use repository-relative paths; never hard-code an absolute path for your local machine.

## Plugin Ecosystem Rules (mobile side)

Mobile plugins ship as a separate npm package (`@<vendor>/<plugin-id>-mobile`). Because React Native cannot safely load arbitrary JavaScript at runtime, mobile plugin support is **bundled per EAS profile**: each CMS instance produces its own mobile binary that includes the plugin packages it needs.

### Extension points only

- The `styleImpls` map in `components/styles/index.ts` becomes seeded with core styles, then merged with plugin styles registered by the SDK at boot.
- Plugin-supplied style implementations must be registered through `@selfhelp/shared/plugin-sdk` `defineMobilePlugin({ styles: {...} })`. Do not hardcode plugin styles in this repo.
- Plugin admin/CMS-authoring flows are not supported on mobile. Mobile only displays plugin-supplied participant-facing UI.
- Unknown plugin styles (declared by the backend but missing on this mobile build) must fall through `UnknownStyle` with an "Open on web" CTA. Never crash, never silently render nothing.

### Per-EAS-profile plugin set

- `selfhelp.plugins.mobile.lock.json` from the matching backend deployment is checked into `dist/` (or a known location) as the source of truth for the mobile build.
- `scripts/plugins-sync.mjs` reads the lock file and regenerates `components/styles/registered.ts` (plus the matching `package.json` dependencies) so Metro bundles only the plugin packages this EAS profile supports.
- The generated `registered.ts` also exports `registeredPluginVersions` (plugin id → bundled version). The runtime version-mismatch banner at `components/plugin-runtime/PluginVersionMismatchBanner.tsx` compares it against the live `/cms-api/v1/plugins/manifest` response and warns the operator when the host is on a newer or older plugin release than the app binary.
- Each production instance therefore has its own pinned plugin set; `eas update --branch <profile>` ships new plugin code to existing installs without store review.

### Realtime, no polling

Plugin progress, dashboards, chat, collaborative editing, file uploads, LLM runs, notifications, and form validation use the mobile equivalent of `usePluginRealtime(pluginId, topic, topicParams)` from `@selfhelp/shared/plugin-sdk` over `react-native-sse`. Polling is allowed ONLY for:

- Initial bootstrap (one-shot manifest fetch + lookup fetch).
- Offline fallback when SSE is unavailable.
- Emergency compatibility mode (when Mercure is intentionally disabled per-instance).

The offline fallback presents a manual refresh button + banner "Realtime updates unavailable". It is NOT a `setInterval` poller.

### Version bump synchronization (bump it EVERYWHERE, in one change)

A version bump is a SINGLE atomic change that updates every place the value appears — a partial bump breaks a CI version gate (a test pins `mobileRendererVersion` and the bundled plugin versions). When you bump:

- the **app package version** → update `package.json` `version` AND the root `version` in `package-lock.json` together, plus `CHANGELOG.md`;
- a **dependency you now require** (e.g. `@selfhelp/shared`, a plugin's mobile package) → update its range in `package.json` AND the resolved entry in `package-lock.json`;
- the **renderer contract / bundled preview set** → keep `mobileRendererVersion` and every plugin `version` / `mobilePackageVersion` identical across `web-preview/preview-plugins.json` and `selfhelp.plugins.mobile.lock.json`, and matching the `@selfhelp/shared` `MOBILE_RENDERER_VERSION` you depend on (`__tests__/unit/pluginHostServices.test.mjs` asserts this).

The Expo store version (`app.config.ts` `version`) is a SEPARATE, user-facing release number and is intentionally NOT tied to the `package.json` dev version — bump it on its own store/EAS cadence, do not force it equal. After any bump, grep the old version string to confirm nothing stale remains.

### Version mismatch handling

- Mobile reads the backend manifest at startup. For every style declared by a plugin without a bundled mobile impl, the renderer marks the style as "web-only" and `UnknownStyle` renders an "Open on web" CTA with the deep link.
- If the backend declares `<plugin>@1.2.0` but the bundled mobile package is `1.0.0`, the renderer shows a yellow "Plugin update required" banner in dev builds; production silently downgrades to web-only.
- The renderer never crashes on a missing plugin.

### Mobile plugin SDK boundary

The only file mobile plugins should import from the SelfHelp side is `@selfhelp/shared/plugin-sdk`. Do not export new mobile APIs to plugins through ad-hoc paths; extend the SDK in `sh-selfhelp_shared` and depend on it from this repo.

### Plugin version semantics

Same as the rest of the ecosystem:

- **patch** — code change only.
- **minor** — always carries a DB change on the backend.
- **major** — breaking change. Mobile may auto-downgrade affected styles until the corresponding EAS update ships.

### Lookup-driven enums

Do not hardcode enum string unions in plugin-related mobile components. Consume lookups through the existing lookup hook (same pattern as the frontend).

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
- The test suite checks shared-registry parity plus renderer helpers, style behavior, and mobile UI adapter contracts.
- `npm run typecheck` runs `tsc --noEmit`.
- `npm run lint` runs the ESLint flat config and currently passes clean with `--max-warnings=0` (zero errors, zero warnings); CI enforces this in `plugin-mobile-check.yml`. Keep it green — do not add new errors or warnings.
- Add or update tests when changing registry behavior, scripts, shared-contract handling, or parsing/normalization logic.
- For UI and renderer changes, smoke test with `npm run web`; verify native-only behavior on Android or iOS when it involves push, camera, audio, permissions, or HeroUI Native primitives.
- For accessibility-sensitive UI changes, verify labels, roles, focus order, dynamic type, contrast, and error messaging with screen-reader-friendly flows on device or emulator when practical.

### Canonical Testing Rules (all SelfHelp repos)

These are the canonical SelfHelp testing policy, shared verbatim across the backend, frontend, shared package, mobile app, and every plugin repo. They describe the target conventions; this app runs Node's built-in test runner (`node --test`) over registry-parity checks plus renderer-helper unit tests (`__tests__/unit/`, using the `__tests__/support/renderMobile.ts` harness), with one release-tier Maestro golden flow under `e2e/golden/`. A rule applies as soon as the tooling it references exists in this repo.

1. Every new feature ships with at least one automated test at the appropriate layer (unit / integration / contract / E2E).
2. Every bug fix ships with a regression test that fails before the fix and passes after.
3. Every new API endpoint ships with a JSON-schema contract test **and** a permission-matrix test (admin/editor/user/guest + at least one negative cross-scope case).
4. Every new CMS style, action type, scheduled-job type, plugin event subscriber, or plugin realtime topic ships with an integration test for registration → use → cleanup.
5. Every new business workflow extends a golden-workflow test in `tests/Golden/` (backend) and, where a UI is involved, `e2e/golden/` (frontend / mobile).
6. Before writing or changing a test, perform a short **test impact analysis**: which workflow can break, which services/controllers/screens/plugin contracts are touched, which existing tests should fail, which new regression test is needed. Tests existing only to inflate coverage are rejected.
7. Tests do not depend on developer credentials. Use the seeded `qa.admin/editor/user/guest@selfhelp.test` personas.
8. QA fixtures use the production permission model. Seed test users through the same `Lookup userStatus/userTypes`, `Group`, `Role`, and `rel_groups_users` entities that production `src/Command/CreateAdminUserCommand.php` uses. Special permissions go through normal admin/domain services, never raw SQL.
9. All test data writes use the `qa.` / `qa-` / `qa_` prefix. Tests never create/update/delete non-QA business records. Read-only access to system baselines (languages, permissions, styles, lookups, plugin metadata, role/group/page-type) is allowed.
10. Tests self-clean (DAMA transaction rollback or an explicit `afterEach`). Integration/golden tests pass the `QaCleanupVerifier` (or the per-repo equivalent).
11. Do not mock domain behaviour in integration/golden tests. Unit tests may use deterministic test doubles but must not hide real business logic. Mock external dependencies (network, time, filesystem) at the boundary only.
12. Date/time tests use `Symfony\Bridge\PhpUnit\ClockMock` (PHP), `vi.useFakeTimers()` (Vitest), or `page.clock.install()` (Playwright).
13. Mercure events are verified via `MercureTestRecorder` (backend) or `mockMercureHub` (shared); never by polling.
14. Anti-flakiness: no `sleep()`, no external internet, no random IDs in fixtures or assertions, no order-dependent tests, no developer-machine absolute paths.
15. The full suite passes in random order. `composer test:random` (or the per-repo equivalent) runs nightly.
16. Test names describe business behaviour, not the method under test (e.g. `testFinishedFormSubmissionSchedulesAndExecutesActionEmailJob`, not `testSubmit`).
17. Prefer asserting public/domain-visible effects (API response, admin API view of scheduled jobs, Mercure event, rendered page) before internal implementation details. DB/queue assertions are secondary or a fallback.
18. Snapshot updates (Vitest, Playwright screenshots, response fixtures) must be intentional: the change is expected, the PR explains why, and a reviewer can compare before/after. Never run `--update-snapshots` just to make CI green.
19. Performance: any test slower than 10s is `@group golden` under `tests/Golden/` (or the per-repo golden area). PR-tier suites complete in under 10 minutes per repo.
20. Coverage gates: ≥ 70% line on `src/Service/**` + `src/Controller/**` (backend); ≥ 60% on new files (other repos). PRs dropping coverage by > 1% on changed files are blocked.
21. Use the standard test commands defined in this repo's Build / Dev Commands section. Never invent new test command names.
22. Tests assert **meaningful behaviour**, not just status codes. At minimum: status + envelope shape + key returned fields + one public side effect.
23. **Do not change production logic to make tests pass.** If a test reveals a production issue, fix the production code and explain in the PR. If the test expectation is wrong, fix the test.
24. **Smallest runnable proof**: after every 1–3 file changes, run `test:changed` (or the single new test file). Do not extend a slice while its current state is red for an unknown reason.
25. **Contract tests for FE/mobile/plugin-consumed responses**: every API response field consumed by frontend, mobile, or plugin code must exist in a JSON Schema under `config/schemas/api/v1/` plus a TypeScript type in `@selfhelp/shared`. Schema drift fails CI. Consumers must not depend on undocumented response fields.
26. **Negative-permission tests are mandatory** for every permission-sensitive endpoint: allowed user → success; lower-privileged user → 403; unauthenticated user → 401; cross-scope/group user → 403 or 404 per the established access rule.
27. **Security regression tests** are required for any change to authentication, authorization, CSRF, JWT issuance/refresh/revocation, logout/session invalidation, plugin trust level or capabilities, or ACL cache invalidation. Security tests assert failure behaviour, not only success.
28. **API backward compatibility**: do not remove or rename a response field without (a) a schema version bump, (b) a shared TS type update, (c) frontend/mobile/plugin adaptation in the same PR, and (d) a changelog entry.
29. **Performance budgets** for critical APIs are asserted in smoke/golden tests: login < 500 ms, admin pages list < 1000 ms, form submit < 1000 ms in the test env. Regressions above 2× the budget block PRs; 1.5×–2× warns.
30. **No real outbound** in tests: tests never send real email/SMS/push/webhooks/external HTTP. Use `RecordingNotifier`, MSW, or a mocked HTTP client, and assert the content of the captured message.
31. **Environment isolation**: test reset commands refuse to run unless `APP_ENV=test`, the database name contains `_test`, the host is in the allow-list, and `--force` is provided. Reset prints the target database name before destroying it.
32. **Fixture version**: `QaBaselineFixture` exposes `QA_FIXTURE_VERSION`; smoke tests print and assert it. Stale fixtures fail fast with a clear message.
33. **CI failure artifacts**: CI uploads PHPUnit logs, coverage report, Playwright traces/videos/screenshots, docker container logs, and a sanitized test DB dump for failed golden tests.
34. **Accessibility checks** for Playwright golden specs use axe-core on the login page, admin page editor, public form page, and plugin admin page.

### Mobile-specific testing additions

- Renderer helpers (`useField`, `readField`, `readStringField` / `readBooleanField` / `readNumberField`, `useInterpolatedField`, `buildSectionClasses`) require a `node --test` unit test under `__tests__/unit/`. Hooks are exercised through `renderHook` from `__tests__/support/renderMobile.ts` (a `react-dom/server` probe — no DOM, no `react-test-renderer`). `.test.mjs` files import the app's `.ts` helpers directly: Node 22 strips types, and `__tests__/support/register.mjs` (preloaded via `--import`) registers the tsconfig-alias / extensionless resolve hook and the RN `__DEV__` global.
- A new CMS style impl extends `__tests__/registry-parity.test.mjs` and adds a renderer snapshot under `__tests__/renderer/` (snapshot harness `__tests__/support/renderMobile.ts`).
- The mobile golden workflow (`form → action → job`) lives at `e2e/golden/form-action-job.yaml` (Maestro). It is release-tier (self-hosted macOS + a QA stack) and is NOT part of `plugin-mobile-check.yml` (whose required-check job id is `mobile-parity`).
- **Coverage gate state (rule 20):** mobile has **no coverage gate** today. The renderer/helper suite runs on the Node test runner (`node --test`), which is not wired to a coverage reporter, and there is no `test:coverage` script. Rule 20's "≥ 60% on new files / no > 1% regression" target is therefore **planned/staged** for mobile, not enforced — do not describe mobile coverage as blocking until a coverage reporter + threshold job exist. Only `@selfhelp/shared` ships a blocking coverage gate today (see the host `docs/developer/15-testing-guidelines.md` "Coverage gates").
- Standard mobile test commands: `npm test`, `npm run typecheck`, `npm run lint`, `npm run test:renderer`, and `npm run test:e2e` (Maestro, release-tier). Do not invent new names.

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
