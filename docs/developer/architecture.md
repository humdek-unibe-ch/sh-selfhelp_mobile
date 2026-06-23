/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
# Architecture

Audience: Developers and technical operators.
Status: active.
Applies to: SelfHelp2 mobile app (sh-selfhelp_mobile).
Last verified: 2026-06-23.
Source of truth: Runtime code, configuration, and tests in this repository.

How the mobile app, backend, and shared package fit together.

## High-level diagram

```mermaid
flowchart LR
    subgraph backend [Symfony Backend]
        api["/cms-api/v1/*"]
        jwt[JWT Service]
        pages[PageService mode-aware]
        cond[ConditionService platform var]
        forms[FormController]
        db[(MySQL)]
        api --- jwt
        api --- pages
        api --- forms
        pages --- cond
        pages --- db
    end

    subgraph shared [sh-selfhelp_shared]
        sharedRegistry[Typed style registry]
        sharedTypes[Per-style + page + auth types]
        sharedApi[Endpoint catalog]
        sharedTokens[Mantine token tables]
        sharedCond[JSON-Logic evaluator]
        sharedAllow[Tailwind allow-list]
        sharedAssets[resolveAssetUrl]
    end

    subgraph mobile [sh-selfhelp_mobile]
        api_client[axios + JWT + X-Client-Type: mobile]
        secure[expo-secure-store refresh]
        picker[Dev server picker]
        aclsse[Mercure SSE direct subscribe]
        router[Expo Router + deep links]
        renderer[BasicStyle dispatcher]
        themeMap[Mantine -> HeroUI tokens]
        uni[Uniwind Tailwind v4]
        heroui[HeroUI Native v1]
        previewWeb[Expo Web preview]
    end

    backend <-->|Bearer + X-Client-Type: mobile| api_client
    sharedRegistry --> renderer
    shared --> api_client
    api_client --> renderer
    api_client --> aclsse
    aclsse --> renderer
    renderer --> router
    renderer --> themeMap
    themeMap --> heroui
    heroui --> uni
    api_client --> secure
    picker --> api_client
```

## Request flow

```mermaid
sequenceDiagram
    participant App
    participant Store as expo-secure-store
    participant API as Symfony /cms-api/v1
    App->>API: POST /auth/login (email, password)
    API-->>App: 200 { access_token, refresh_token, user }
    App->>Store: write refresh_token
    App->>API: GET /pages/by-keyword/home (Bearer + X-Client-Type: mobile)
    API-->>App: 200 page tree (mobile-filtered)
    App->>API: GET /pages/by-keyword/x (expired access)
    API-->>App: 401
    App->>API: POST /auth/refresh-token
    API-->>App: 200 access_token (rotated refresh_token)
    App->>Store: write rotated refresh_token
    App->>API: GET /pages/by-keyword/x (retry)
    API-->>App: 200
```

## Layers

1. **Providers** (`providers/`) — `ErrorBoundary`, `ServerProvider`, `QueryProvider`, `I18nProvider`, `ThemeProvider`, `AuthProvider`, `SessionSyncProvider`, `NativeBootstrap`. Composed by `AppProviders.tsx`. They run in this order so that auth restore waits for the configured base URL before any protected page/menu work is enabled.
2. **Stores** (`stores/`) — Zustand: `serverStore` (URL), `authStore` (access token + user), `languageStore` (locale + available languages).
3. **Services** (`services/`) — typed wrappers around the API: `apiClient.ts` (singleton axios), `pageService.ts`, `formsService.ts`, `authService.ts`, `languageService.ts`, `secureStore.ts`.
4. **Hooks** (`hooks/`) — TanStack Query wrappers: `usePageContent`, `useLanguages`, `useFormSubmit`.
5. **Renderer** (`components/renderer/`) — `PageRenderer` walks the page tree, evaluates `condition`, runs `{{field}}` interpolation, and dispatches each section to a registered style component via `BasicStyle`. `UnknownStyle` and `DebugWrapper` give safe fallbacks.
6. **Styles** (`components/styles/`) — One folder per CMS style group (layout, typography, media, interactive, forms, composite, auth). The map from `style_name → React component` lives in `components/styles/index.ts`.
7. **Native** (`native/`) — Expo modules: notifications, deep links, permissions, audio recorder, OTA updates, device service.

## Page rendering pipeline

For every section in the tree:

1. **Condition** — `evaluateCondition` from the shared package runs JSON-Logic with the context `{ platform: 'mobile', language, current_date, ... sectionVars }`. Falsy → skip.
2. **Interpolation** — every `{{field}}` placeholder is resolved via `replaceCalcedValues` against the page's value map.
3. **Class string** — `buildSectionClasses(section)` parses `css_mobile`, runs each token through the shared allow-list + remap, and joins the survivors. Unsupported tokens are dropped + warned in `__DEV__`.
4. **Theme props** — the unprefixed portable semantic fields (`size`, `color`, `radius`, `spacing`, `variant`) are mapped to HeroUI props by the helpers in `styles/`.
5. **Render** — the registered HeroUI Native impl receives `{ section, values }`. Children (when present) are recursively rendered through `<Children>`.

## State + cache

- TanStack Query with `createAsyncStoragePersister` persists page caches across cold starts. Query keys include server URL and auth scope so anonymous/stale data cannot satisfy logged-in menu/page requests after a reload.
- Auth state is in-memory (`accessToken`) + SecureStore (`refresh_token`) so a phone reboot doesn't kick the user out, but a memory dump can't reveal the access token. See [auth-bootstrap.md](./auth-bootstrap.md) for the exact restore order, refresh queue, direct reload behavior, and live-update fallback.
- `SessionSyncProvider` holds the authenticated `user-data` query, watches `acl_version`, and subscribes directly to Mercure via `hooks/useAclEventStream.ts`. On Expo Web this is still a direct hub connection, not a same-origin BFF proxy; the browser host therefore must be allow-listed in both Symfony API CORS and the Mercure hub `cors_origins`.

## Related docs

- [setup.md](../operations/setup.md) — install + first run.
- [server-selection.md](../operations/server-selection.md) — multi-tenant strategy.
- [styling/cms-classes.md](./styling/cms-classes.md) — CMS Tailwind allow-list + remap.
- [cookbook/add-style.md](../cookbook/add-style.md) — extending the renderer.
