/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
# Mobile preview (web image)

Audience: Mobile developers, technical operators, build maintainers.
Status: active.
Applies to: SelfHelp2 Expo/React Native mobile app (`sh-selfhelp_mobile`) `>=0.2.0`.
Last verified: 2026-06-23.
Source of truth: `config/webPreviewContract.ts`, `config/webPreview.ts`, `web-preview/server.mjs`, `web-preview/preview-plugins.json`, `web-preview/Dockerfile`, `scripts/plugins-sync.mjs`, `components/renderer/OpenOnWebFallback.tsx`, `.github/workflows/web-preview-release.yml`.

The **mobile preview** is the Expo app built as a **web export** and served as a
standalone, manager-distributed Docker image (`selfhelp-mobile-preview`). A CMS
admin embeds it in an iframe inside the page editor to see a page rendered with
the real mobile renderer. It is the mobile half of the cross-repo **Mobile
Preview Service** (core `>=0.1.19`, `@selfhelp/shared >=1.15.0`, manager
`>=1.7.0`, frontend `>=0.1.31`).

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
  &language=<locale>&backendUrl=<dev-only>
```

| Param            | Type / values                     | Default    | Meaning |
|------------------|-----------------------------------|------------|---------|
| `embed`          | bool                              | `false`    | Running inside the CMS iframe (hide dev chrome, slim badge). |
| `keyword`        | string \| null                    | `null`     | CMS page keyword to route to on boot. |
| `device`         | `phone` \| `tablet`               | `phone`    | Simulated device class. |
| `orientation`    | `portrait` \| `landscape`         | `portrait` | Simulated orientation. |
| `frame`          | bool                              | `true`     | Draw the device frame (`frame=0` disables it even when embedded). |
| `preview`        | bool                              | `false`    | Fetch draft/unpublished CMS content. |
| `previewSession` | string \| null                    | `null`     | One-time preview-session code to exchange for a scoped JWT. |
| `hideDebugPanel` | bool                              | `false`    | Suppress the floating debug FAB. |
| `banner`         | bool                              | `true`     | Show the slim "preview" badge (`banner=0` hides it). |
| `language`       | string \| null                    | `null`     | Locale override for the render. |
| `backendUrl`     | string \| null                    | `null`     | **Dev-only** backend origin override; ignored in the production preview. |

Booleans accept `1/true/yes/on` and `0/false/no/off` (case-insensitive); anything
else falls back to the default. Empty strings normalize to `null`.

## 3. Boot flow

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
5. **Keyword routing.** When `keyword` is set, the app routes to that page on
   boot (`/[keyword]`).

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
