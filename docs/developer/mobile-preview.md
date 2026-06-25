/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
# Mobile preview (web image)

Audience: Mobile developers, technical operators, build maintainers.
Status: active.
Applies to: SelfHelp2 Expo/React Native mobile app (`sh-selfhelp_mobile`) `>=0.1.20`.
Last verified: 2026-06-25.
Source of truth: `index.js`, `config/webPreviewBoot.ts`, `config/webPreviewContract.ts`, `config/webPreviewSession.ts`, `config/webPreview.ts`, `app/_layout.tsx`, `providers/I18nProvider.tsx`, `components/shell/LanguageSwitcher.tsx`, `components/shell/PageModalHost.tsx`, `components/shell/usePageNavigation.ts`, `components/preview/PreviewSyncBridge.tsx`, `components/preview/PreviewDraftBanner.tsx`, `components/dev/PhoneFrame.tsx`, `services/previewBridgeState.ts`, `services/previewPreferenceSync.ts`, `stores/pageModalStore.ts`, `components/shell/navigationUtils.ts`, `web-preview/server.mjs`, `web-preview/preview-plugins.json`, `web-preview/Dockerfile`, `scripts/plugins-sync.mjs`, `components/renderer/OpenOnWebFallback.tsx`, `.github/workflows/web-preview-release.yml`.

The **mobile preview** is the Expo app built as a **web export** and served as a
standalone, manager-distributed Docker image (`selfhelp-mobile-preview`). A CMS
admin embeds it in an iframe inside the page editor to see a page rendered with
the real mobile renderer. It is the mobile half of the cross-repo **Mobile
Preview Service** (core `>=0.1.19`, `@selfhelp/shared >=1.14.25`, manager
`>=1.6.5`, frontend `>=0.1.31`).

The initial validated embed query is retained in versioned `sessionStorage`.
The custom entry (`index.js`) strips the one-time `previewSession` code from the
URL **before** expo-router boots (see §3, step 1), and Expo Router removes the
rest of the query while navigating to CMS routes, so this snapshot lets a
document reload or Fast Refresh module reset recover the preview session, backend
override, language/draft flags, and bridge origin. It is restored only inside an
iframe and is cleared automatically with the browser tab.

> Operator/route view: [`sh-manager` → operator/update.md](../../../sh-manager/docs/operator/update.md)
> ("Mobile-preview updates") and operator/domains-and-ports.md ("How the address
> is wired"). Cross-repo version contract:
> [`sh-selfhelp_backend` → developer/cross-repo-compatibility-matrix.md](../../../sh-selfhelp_backend/docs/developer/cross-repo-compatibility-matrix.md).

## 1. Build mode

The same app source builds in two ways:

- **Native** (default) — the normal Expo/EAS app.
- **Web preview** (`APP_WEB_PREVIEW=1`) — an Expo **web export** (`expo export
  --platform web`) whose runtime reads its intent from the iframe URL instead of
  from persisted device state. The build is served by the in-container Node
  server (below), never by `expo start` in production.

`config/webPreview.ts` is the runtime accessor: it returns `EMPTY_PREVIEW_PARAMS`
on native / non-web, and otherwise parses `window.location.search` with the pure
parser from `config/webPreviewContract.ts`.

## 2. Embed contract (iframe URL → params)

`config/webPreviewContract.ts` is a **pure, unit-tested** parser (no expo/runtime
imports, runnable under `node --test`). The CMS builds the matching URL with the
frontend's `mobilePreviewUrl.ts` builder — keep the two in sync byte-for-byte.

```
/mobile-preview/?embed=1&keyword=<kw>&device=phone|tablet
  &orientation=portrait|landscape&frame=0|1&preview=true
  &previewSession=<one-time-code>&hideDebugPanel=true&banner=0
  &language=<locale>&modal=auto|on|off&backendUrl=<dev-only>
  &previewShell=1&parentOrigin=<shell-origin>
```

| Param            | Type / values                     | Default    | Meaning |
|------------------|-----------------------------------|------------|---------|
| `embed`          | bool                              | `false`    | Running inside the CMS iframe (hide dev chrome, slim badge). |
| `keyword`        | string \| null                    | `null`     | CMS page keyword to route to on boot. |
| `device`         | `phone` \| `tablet`               | `phone`    | Simulated device class. |
| `orientation`    | `portrait` \| `landscape`         | `portrait` | Simulated orientation. |
| `frame`          | bool                              | `true`     | Draw the device frame. `frame=0` disables the in-app bezel even when embedded (the Live Preview uses `frame=0` and draws its own bezel); the web root stays viewport-bound so the bottom tab bar still pins — see §2a. |
| `preview`        | bool                              | `false`    | Fetch draft/unpublished CMS content. |
| `previewSession` | string \| null                    | `null`     | One-time preview-session code to exchange for a scoped JWT. |
| `hideDebugPanel` | bool                              | `false`    | Suppress the floating debug FAB. |
| `banner`         | bool                              | `true`     | Show the slim "preview" badge (`banner=0` hides it). |
| `language`       | string \| null                    | `null`     | Locale override for the render. |
| `modal`          | `auto` \| `on` \| `off`           | `auto`     | How to present the keyword on boot — see §3a. `auto` opens **off-menu** pages as a modal over home; `on` always modal; `off` always full-screen. |
| `backendUrl`     | string \| null                    | `null`     | **Dev-only** backend origin override; ignored in the production preview. |
| `previewShell`   | bool                              | `false`    | Embedded in the CMS **Live Preview** shell — activate the sync bridge (see §3b). |
| `parentOrigin`   | string \| null                    | `null`     | Shell origin the sync bridge `postMessage`s to (never `'*'`). Inert without `previewShell`. |

Booleans accept `1/true/yes/on` and `0/false/no/off` (case-insensitive); anything
else falls back to the default. Empty strings normalize to `null`. `modal` also
accepts the literal `auto`; unknown/blank values fall back to `auto`. The
`previewShell` / `parentOrigin` param **names** come from the shared bridge
contract (`@selfhelp/shared`), the single source of truth shared with the web
frame and the Live Preview shell.

### 2a. Device frame and viewport binding (`components/dev/PhoneFrame.tsx`)

`PhoneFrame` renders no JSX — it injects a `<style>` tag. With `frame=1` it sizes
`html`/`body`/`#root` to a fixed device viewport and draws the rounded bezel.
With `frame=0` (the mode the CMS Live Preview embeds in — the shell draws its own
bezel) it still injects a **base** stylesheet that binds `html`/`body`/`#root` to
`100%` height and clips overflow. This matters because Expo's default web shell
does **not** bind the root to the viewport height: without it the app grows to
its content height inside the iframe and the **bottom tab bar is pushed below the
fold** (the drawer menu still works, which is why only the tabs went missing).
Binding the root makes the app scroll internally and keeps the tab bar pinned,
with or without the frame.

In **both** modes the injected tag also hides the desktop browser scrollbar
(`::-webkit-scrollbar { display: none }` + `scrollbar-width: none`) so the
preview reads like a real device — native iOS/Android auto-hide their scroll
indicators, whereas desktop browsers (notably Windows) render a permanent track.
Scrolling still works via wheel / trackpad / touch / keyboard; only the visible
track is removed. The rule lives in this injected tag, so it only affects the
dev / web-preview builds, never production native.

## 3. Boot flow

0. **Strip `previewSession` from the URL (before expo-router).** The custom entry
   `index.js` imports `config/webPreviewBoot.ts` ahead of `expo-router/entry`;
   on web it persists the full embed query to `sessionStorage` and
   `replaceState`s the URL **without** `previewSession`
   (`capturePreviewSessionFromUrl`). This is required because on web
   `expo-router/entry` renders synchronously as it evaluates and its linking
   layer reads `window.location` immediately. A one-time code left in the address
   bar destabilises expo-router's web `state <-> URL` round-trip: the linking
   effect re-pushes the root route on every commit, Chromium throttles the
   `history.pushState` flood ("Throttling navigation to prevent the browser from
   hanging"), and the embedded pane hangs on "Starting up…". The other embed
   params are stable and stay in the URL; the runtime recovers the full query
   (incl. the code) from `sessionStorage`. No-op on native.
1. **Parse** the embed params (`config/webPreview.ts`).
2. **Exchange the one-time code.** If `previewSession` is present, the app POSTs
   it to `POST /cms-api/v1/mobile-preview/session/exchange` (through the
   same-origin proxy, see below) and receives a **short-lived, in-memory**
   `purpose: 'mobile_preview'` JWT. The admin token is **never** exposed to the
   preview; the one-time code is single-use.
3. **Same-origin API base.** In web-preview mode the API base is the preview's
   own origin + `/api` (proxied to the private backend), so the backend host is
   never reachable from the browser directly. `backendUrl` overrides this in dev
   only.
4. **Session-only dev overrides.** `device` / `orientation` / `preview` /
   `frame` / `banner` are applied to the dev-mode store **without persistence**
   and in a hydration-safe way, so a preview never mutates a real device's saved
   settings.
5. **Pinned preview locale.** `I18nProvider` applies `language=<locale>` from the
   embed URL before the preview's page/menu queries settle. It does not call the
   normal token-rotating `setLanguage()` mutation during preview bootstrap.
6. **Keyword presentation.** When `keyword` is set, the app presents it once per
   preview session per the `modal` param (see §3a) — either routing full-screen
   to `/[keyword]` or opening it as a modal over home.

## 3a. Off-menu pages open as a modal

A page that is **not on the navigation menu** (no `navPosition`, or headless) has
no drawer/tab entry to reach it, so it is presented as a **modal sliding up over
the current page** instead of routing to a bare full-screen page. This makes
off-menu pages — exactly the ones an author wants to "just show" — immediately
visible in context. This is **app-wide core behaviour**, not preview-only: it
applies to every in-app navigation (a `Button`/`Link` to an off-menu keyword) and
the preview boot reuses the same mechanism.

- **Central navigator (`components/shell/usePageNavigation.ts`).** Every in-app
  "go to this page" affordance (`Button`, `Link`) calls `navigateToPage(target)`,
  which opens a modal when `isKeywordOnMenu(pages, keyword)` is false (off-menu /
  unknown) and otherwise `router.push`es `/[keyword]` full-screen. External URLs
  and "open in new tab" are handled by the caller (OS link), not here.
- **Preview boot decision (`app/_layout.tsx`).** For the launched preview keyword
  the gate resolves the presentation once per session: `modal=on` → always modal;
  `modal=off` → always route; `modal=auto` → **wait for the navigation pages**
  (`usePages`) and then open a modal when the page is off-menu, otherwise route to
  `/[keyword]`.
- **Host (`components/shell/PageModalHost.tsx`).** Mounted once at the root, it
  reads the keyword from `stores/pageModalStore.ts` and renders it via the
  existing `CmsPageScreen` inside a dependency-light React Native `Modal` (no
  third-party sheet) with a title + close button. The underlying route is never
  changed when the modal opens, so **closing returns to the previous page**.
- **On-menu pages are unchanged** — they route full-screen as before. Only
  off-menu targets are subject to the modal rule.

## 3b. Synchronized navigation (Live Preview sync bridge)

The full-screen CMS **Live Preview** shell can show the web frame and this mobile
frame side-by-side and keep them on the **same page**: click a link in one frame
and the other follows. The mobile half is `components/preview/PreviewSyncBridge.tsx`
(web-only; native is a no-op), mounted once at the root and **dormant** unless the
shell embeds the frame with `previewShell=1` (the activation is read from the
cached web-preview runtime, so it survives the in-app navigations that drop the
query string).

When active it implements the shared bridge contract (`@selfhelp/shared`):

- **Reports navigations up.** On every Expo Router path change (and when the boot
  modal opens an off-menu page) it `postMessage`s `selfhelp-preview:navigated` to
  the shell with the current page **keyword** (and the preview locale), so the
  shell can drive the **web** frame to the same page.
- **Accepts navigate commands down.** On `selfhelp-preview:navigate` from the
  shell it follows with **no reload** (the scoped preview session and app state are
  preserved), applying the **same off-menu rule as in-app navigation** (§3a /
  `usePageNavigation`): an **on-menu** keyword routes full-screen (soft
  `router.replace` to `/[keyword]` or home), while an **off-menu** keyword
  (footer-only / unassigned / headless / unknown — e.g. `impressum`) opens as a
  **modal sheet** over the current page via `usePageModalStore`, exactly like the
  normal app. A keyword that does not exist lands on the standard not-found state
  (inside the sheet for an off-menu target).
- **Loop-safe.** The shell owns the canonical page and ignores the echo of a
  command it just sent (its per-frame "expected keyword" guard); this bridge also
  skips a command for the page it is already on. So web↔mobile never ping-pong.
- **READY waits for the initial route.** The listener is installed during
  bootstrap, but `selfhelp-preview:ready` is emitted only after server/auth
  bootstrap and after the requested initial page or modal is visible. This keeps
  the shell's immediate `NAVIGATE` reply from racing `GateController`'s initial
  `router.replace()`.
- **Theme-only preference sync.** The bridge accepts/reports the shared
  preference messages for light/dark/auto, but normalizes every live payload to
  `{ colorScheme, locale: null }`. Theme remains smooth and two-way without
  touching auth or page queries.
- **Language is URL-bound.** The shell changes language by minting/remounting the
  frame with a new `language=<locale>` URL and language-scoped preview session.
  The live bridge never calls `setLanguage()`: that operation rotates the token
  and invalidates all queries, and a two-way locale echo previously created a
  request loop that left startup spinning and the drawer/tabs empty.
- **Origin-scoped.** Messages are only sent to / accepted from the shell origin
  handed in via `parentOrigin` (the cross-origin dev case), never `'*'`; foreign
  / malformed messages are dropped by the shared `isPreviewBridgeMessage` guard.

In the embedded Live Preview the language list remains visible in the account
sheet (`components/shell/LanguageSwitcher.tsx`) but is **read-only** and labeled
"Controlled by the web preview". The scoped preview token is GET-only and bound
to the minted language, so the normal `/auth/set-language` mutation is not valid
there. The web pane's language control is the single authority and re-mints the
mobile session. Outside the paired preview, the mobile language picker remains
fully interactive.

The page-state surfaces (`components/feedback/ErrorScreen.tsx`,
`components/feedback/LoadingScreen.tsx`) are **theme-aware** via `useAppColors`, so
the not-found / no-access / sign-in / error and loading screens read correctly in
the dark device frame.

## 3c. Draft banner

When the preview renders **draft** content (`preview=true`, mirrored into
`devModeStore.previewMode`), `components/preview/PreviewDraftBanner.tsx` shows a
prominent orange **"PREVIEW MODE - This page shows draft content"** banner at the
top of the framed viewport — the mobile twin of the web frame's
`PreviewModeIndicator`, so an editor can always trust which mode the rendered page
is in. Hidden for published previews and the normal app.

## 4. In-container server (`web-preview/server.mjs`)

A dependency-free Node server (built-ins only, so the image stays slim). It:

- **Serves** the Expo web export under `SELFHELP_PREVIEW_BASE_URL` (default
  `/mobile-preview`) with an SPA fallback to `index.html` and path-traversal
  protection.
- **Reverse-proxies** a NARROW allowlist of `<base>/api/*` requests to the
  private backend (`SELFHELP_BACKEND_INTERNAL_URL`), stripping the `<base>/api`
  prefix so the backend sees a normal `/cms-api/...` path. This mirrors the
  backend `MobilePreviewAccessGuard` (defense in depth):
  - **GET** allowlist: `/cms-api/v1/pages`, `/cms-api/v1/languages`,
    `/cms-api/v1/plugins/manifest`, `/cms-api/v1/auth/user-data` (prefix match).
  - **POST** allowlist: exactly `/cms-api/v1/mobile-preview/session/exchange`.
  - Everything else → `403`. No write/admin route is reachable through the proxy
    even with a valid scoped token.
- **Exposes** `<base>/version.json` (image `version` + `mobileRendererVersion` +
  `bundledPlugins`) and `/healthz` (+ `<base>/healthz`) for the manager's health
  probe.

Env: `PORT` (default `8080`), `SELFHELP_BACKEND_INTERNAL_URL` (required to
proxy), `SELFHELP_PREVIEW_BASE_URL` (default `/mobile-preview`),
`SELFHELP_PREVIEW_DIST_DIR` (default `./dist`). The allowlist helpers
(`isProxyAllowed`, `resolveBackendPath`, `ALLOWED_GET_PREFIXES`,
`ALLOWED_POST_EXACT`) are exported for `node --test`.

## 5. Curated plugin bundling + web fallback

The preview can render a **curated set** of official plugins natively (RN-on-web)
so a page that uses, e.g., SurveyJS looks right in the preview.

- `web-preview/preview-plugins.json` is the **snapshot** baked into the image:
  `mobileRendererVersion` (the renderer contract the image is built against,
  mirroring `@selfhelp/shared` `MOBILE_RENDERER_VERSION`) plus a `plugins[]` list
  (`pluginId`, `version`, `mobilePackage`, `mobilePackageVersion`).
- The build runs `scripts/plugins-sync.mjs --snapshot <file>` against that JSON
  (NOT a live instance): it adds each plugin's mobile package to `package.json`
  and regenerates `components/styles/registered.ts` so the listed plugins are
  linked into the bundle.
- **Every other plugin** (third-party / not bundled) falls back to
  `components/renderer/OpenOnWebFallback.tsx` — a card with a deep-link that
  opens the page in the **web frontend** (using `webFrontendOrigin` when running
  in web-preview mode). The mobile preview never crashes on an unknown plugin.

This is the bundling half of the **dual-axis mobile plugin gate**: a plugin
declares `compatibility.mobile` (renderer contract) plus `reactNative`/`expoSdk`
(runtime) in its `plugin.json`; the manager blocks a plugin whose `mobile` range
excludes the image's `mobileRendererVersion`, warns when a compatible plugin is
not in the bundled set (it then uses the web fallback), and informs for web-only
plugins. See the backend
[`versioning-and-compatibility.md`](../../../sh-selfhelp_backend/docs/plugins/versioning-and-compatibility.md).

## 6. Local development & live-reload

Two ways to develop the preview UI:

- **Fast refresh (recommended).** Run the app on web with Expo and point the CMS
  panel at it. In the page editor's **Mobile preview** panel, set the preview
  origin to your local dev server (the frontend reads
  `NEXT_PUBLIC_MOBILE_PREVIEW_ORIGIN`, e.g. `http://localhost:8081`). Then:

  ```bash
  APP_WEB_PREVIEW=1 npx expo start --web
  ```

  The iframe loads your dev server, so editing a renderer/component hot-reloads
  in place. Pass `backendUrl=<your backend origin>` in the iframe URL (dev only)
  if your local app must reach a backend other than the proxied one.

- **Production parity (image).** Build and serve exactly what ships:

  ```bash
  APP_WEB_PREVIEW=1 npx expo export --platform web   # -> dist/
  node web-preview/server.mjs                         # serves dist/ + proxy
  # or build the image:
  docker build -f web-preview/Dockerfile -t selfhelp-mobile-preview .
  ```

Run the pure contract/server tests with `node --test` (parser +
allowlist/path helpers).

## 7. Release CI

`.github/workflows/web-preview-release.yml` (fires on `v*` tags): builds + pushes
the image, attaches SBOM / Trivy / cosign, emits the signed
`mobile-preview-release.json` (incl. `bundledPlugins` + `mobileRendererVersion`)
and a `release-manifest.json` (with `supports.core`), writes `dist/version.json`,
and `repository_dispatch`es the registry (`sh2-plugin-registry`) to auto-stage
the release under `registry.json#mobilePreview[]`. See the registry's
`mobile-preview-release.schema.json`.
