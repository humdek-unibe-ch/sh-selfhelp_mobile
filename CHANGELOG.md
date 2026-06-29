/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
# Changelog

## 0.1.30

### show-user-input headers honour the data-column display name (issue #56 v2)

The mobile `show-user-input` card list rendered raw data keys as labels. After
the host's Interpolation v2 switch, entries are keyed by the immutable
`field_key` (e.g. `section_230`) instead of the human input name, so those keys
leaked into the card labels and a `fields_map` authored against the human name
no longer matched.

Fix: the renderer now reads the section's `field_labels` (`field_key =>
display_name`) map. Default headers show the display name (falling back to the
key), and a `fields_map` entry resolves to a real data key by `field_key` first,
then by the current `display_name`, so renaming a column relabels the header
automatically and never breaks an existing mapping. Fully backward compatible:
on an older host (entries keyed by name, no `field_labels`) every branch falls
back to the key, preserving the previous behaviour, so `supports.core` stays
`>=0.1.19 <0.2.0`.

## 0.1.29

### Fix installed Live Preview native-link replay on web

The installed `selfhelp-mobile-preview` image could still stall on the mobile
pane's "Starting up..." screen after successfully loading the iframe and
exchanging the one-time preview code. The remaining trigger was not the backend
or the exchange response: `NativeBootstrap` was still running the native
deep-link bootstrap on Expo Web. In the installed image, the iframe lives under
`/mobile-preview/`, so `Linking.getInitialURL()` could replay that browser URL
as if it were a native deep link and push `/mobile-preview` through Expo Router,
reintroducing a client-side History API loop.

Fix: keep plugin host service registration active on web, but skip the native
initial-link subscription and OTA startup check for web runtimes. Native iOS and
Android still install the same startup side effects as before. No backend
contract change; `supports.core` stays `>=0.1.19 <0.2.0`.

## 0.1.28

### Fix the production Live Preview navigation throttle for the full embed query

The installed `selfhelp-mobile-preview` image could still hang on the
"Starting up…" splash with Chromium logging *"Throttling navigation to prevent
the browser from hanging"* even after 0.1.27 stripped the one-time
`previewSession` code. In production the remaining embed params (`embed`,
`keyword`, `preview`, `modal`, `previewShell`, `parentOrigin`, `language`, …)
were still visible to Expo Router at `/mobile-preview/`, so its web linking layer
could keep reconciling the root route plus query string during startup.

Fix: the pre-router boot cleanup now persists the full embed query in
`sessionStorage` and then reduces the visible URL to the bare `/mobile-preview/`
path before `expo-router/entry` runs. `getWebPreviewRuntime()` still recovers the
full contract from session storage, so token exchange, draft mode, keyword,
language, modal mode, and bridge origin are unchanged; only Expo Router stops
seeing preview-only query params. No backend contract change; `supports.core`
stays `>=0.1.19 <0.2.0`.

## 0.1.27

### Fix the Live Preview "Starting up…" hang (previewSession navigation flood)

The embedded mobile Live Preview could hang indefinitely on the "Starting up…"
splash with Chromium logging *"Throttling navigation to prevent the browser from
hanging"* (https://crbug.com/1038223). The earlier 0.1.24–0.1.26 work fixed the
bridge READY/NAVIGATED loop, but a second, independent loop remained.

Root cause (isolated with a Chromium DevTools-Protocol trace against the deployed
bundle): the one-time `previewSession` code in the iframe URL destabilises
expo-router's web `state <-> URL` round-trip. expo-router's `useLinking` effect
re-pushed the root route (`/mobile-preview/`) on **every** React commit, so
`history.pushState` was called in a tight loop until Chromium throttled it and
the renderer starved — the session-exchange request never got CPU, which is why
it looked like an auth/403 failure. The flood reproduced with `previewSession`
present in **any** combination (even alone) and never without it; an arbitrary
extra query param did not trigger it.

Fix: strip `previewSession` from the address bar **before** expo-router boots.
A new custom `index.js` entry imports `config/webPreviewBoot.ts` ahead of
`expo-router/entry`; on web it persists the full embed query to `sessionStorage`
(so `getWebPreviewRuntime` still recovers the one-time code for the token
exchange) and `replaceState`s the URL without `previewSession`. The other embed
params (`embed`, `keyword`, `modal`, `previewShell`, `parentOrigin`, …) are
stable under expo-router and are left in place. No-op on native.

This also stops the one-time code from lingering in browser history. No backend
contract change; `supports.core` stays `>=0.1.19 <0.2.0`. Verify after updating
that `/mobile-preview/version.json` reports `0.1.27` and the embedded frame
reaches the requested page instead of stalling on "Starting up…".

## 0.1.26

### Re-ship the production Live Preview fix (clean image rebuild)

Version-only bump that re-publishes the `selfhelp-mobile-preview` image so the
0.1.25 production-preview fix actually reaches running instances.

Background: 0.1.25 fixed the READY/NAVIGATED loop that struck the **installed**
image (served under the `/mobile-preview` base path) — the keyword the bridge
derives from `usePathname()` now strips that base prefix
(`previewKeywordFromPathname`), so the shell's `NAVIGATE(canonicalKeyword)` after
`READY` matches the frame's current keyword and is ignored instead of triggering
a `router.replace()` storm that Chromium throttles ("Throttling navigation to
prevent the browser from hanging"), leaving the embedded pane stuck. Instances
whose container still serves `/mobile-preview/version.json: 0.1.24` never received
that fix and continued to stall + fall back to the login screen (whose POST is
correctly rejected `403` by the same-origin proxy allowlist). This release exists
so the manager offers a clean update and the running container is rebuilt from
source that contains the fix — verify by checking `/mobile-preview/version.json`
reports `0.1.26` after updating.

No code or contract change versus 0.1.25; `supports.core` stays `>=0.1.19`.

## 0.1.25
 - fix mobile preview for production

## 0.1.24

### Live Preview no longer publishes its temporary startup route

The embedded web preview now waits until its requested initial page is visible
and the bridge has announced `READY` before sending `NAVIGATED` messages to the
CMS shell. This prevents the temporary Expo root route from overwriting the
shell's canonical page while `GateController` is still applying its initial
`router.replace()`, which could trigger Chromium's navigation throttling and
leave the mobile pane stuck on "Starting the mobile preview…".

### Web preview no longer initializes Expo push notifications

The web build now resolves notification helpers to a platform-specific no-op
module that does not import `expo-notifications`. This removes Expo's unsupported
web push-token listener warning while leaving Android and iOS notification
registration unchanged.

## 0.1.23

### Off-menu pages open as a modal — now a GLOBAL rule

The "an OFF-MENU page (no drawer/tab entry) opens as a MODAL sheet over the
current page, an ON-MENU page routes full-screen" rule used to live only in
`usePageNavigation` (links/buttons) and the `[keyword]` route guard. It is now a
single imperative chokepoint, `navigateToPage()`
(`components/shell/usePageNavigation.ts`), backed by the pure decision
`resolvePageNavigation()` (`components/shell/navigationUtils.ts`), that **every**
"load a page" entry point calls:

- plugin host redirects (`services/pluginHostServices.ts` → a survey's "redirect
  on completion"),
- form post-submit redirect + cancel (`FormUserInput.hooks.ts`),
- `ActionIcon` page links,
- and `usePageNavigation` (links/buttons), which now delegates to it.

Because the rule is applied **directly** against the cached menu (it opens the
page-modal store itself rather than deferring to the `[keyword]` route guard), it
now behaves identically in the native app **and** inside the web-export live
preview, where the route guard intentionally defers to the preview boot router —
previously letting an off-menu survey redirect render full-screen in the preview.

## 0.1.22

### Host-owned navigation for plugin in-content redirects (live preview parity)

Adds `IMobileHostServices.navigate(target, external?)` to the mobile host-services
bridge (`services/pluginHostServices.ts`), implemented with Expo Router
(`router.push`) for internal CMS targets and `Linking.openURL` for external URLs —
mirroring the app's own post-submit redirect (`FormUserInput`) and link handling
(`Link`). A plugin (e.g. SurveyJS "redirect on completion") now routes its
redirect through the host instead of touching `window.location`.

This fixes the **live preview** symptom where a survey redirect behaved
"weirdly" while it worked in the standalone app: the plugin's web fallback did a
same-window `location.assign`, which navigated (and broke) the embedded preview
iframe instead of the app. With host navigation the redirect routes through the
app router in BOTH surfaces. Requires `@selfhelp/shared` `^1.17.0`
(`MOBILE_RENDERER_VERSION` `0.3.0`), which the preview image now advertises.

### Re-adds SurveyJS to the curated preview bundle (at 0.3.3)

`web-preview/preview-plugins.json` bundles `sh2-shp-survey-js@0.3.3` again (it was
dropped in 0.1.21 while the mobile package's npm publish was unblocked). The
0.3.3 survey renderer ships the self-contained-font fix (no `fonts.gstatic.com`)
and the host-navigation redirect fix, so the live preview renders the survey with
no blocked font requests and correct redirects.

## 0.1.20

### Live Preview: bottom tab bar no longer disappears with the device frame off

Fixes the CMS **Live Preview** symptom where the mobile pane rendered the page
content and the drawer menu worked, but the **bottom tab bar was missing** —
even though the same tabs render in the standalone mobile web image.

Root cause: the standalone image runs with the device frame **on**, which binds
the web root to a fixed device viewport (`components/dev/PhoneFrame.tsx`). The
Live Preview embeds the app with the frame **off** (`frame=0`), and Expo's
default web shell does not bind the root to the viewport height — so the app
grew to its content height inside the iframe and the tab bar was pushed below
the visible (scrolled) area.

The frame-off path now injects a small base stylesheet that binds
`html`/`body`/`#root` to `100%` height and clips overflow, mirroring how the
framed mode bounds the root. The app scrolls internally and the tab bar stays
pinned to the bottom, with or without the device frame. No contract change.

### Live Preview: hide the desktop scrollbar so the preview looks like a device

The web preview showed a permanent desktop scrollbar track down the right edge,
which made the embedded mobile pane read like a web page rather than a phone —
native iOS/Android auto-hide their scroll indicators and only flash them while
scrolling. `components/dev/PhoneFrame.tsx` now appends a scrollbar-hiding rule
(`::-webkit-scrollbar { display: none }` + `scrollbar-width: none`) to its
injected `<style>` tag in **both** frame modes. Scrolling still works via wheel,
trackpad, touch, and keyboard; only the visible track is removed. The rule is
scoped to that injected tag, so it only affects the dev / web-preview builds,
never production native. No contract change.

## 0.1.19

### Live Preview: theme syncs live, language is URL-bound (no more loop)

Fixes the CMS **Live Preview** symptom where the embedded mobile frame stayed on
"Starting up…" with the console looping endlessly, the network log flooding with
proxied `/cms-api` requests, the drawer/tab menu rendering empty, and Chromium
logging *"Throttling navigation to prevent the browser from hanging"*
(`crbug 1038223`).

Root cause: the shell pushed its **language** to the frame over the cross-frame
bridge, which made the frame call `setLanguage` — that rotates the scoped preview
token **and** runs a full `invalidateQueries`. Under the two-way echo it looped
into a query-invalidation storm that (a) flooded the bridge + network and (b)
kept `usePages` from ever completing its first fetch, so `getMenuTree()` stayed
empty and the drawer/tabs showed *"No menu pages"*.

The fix splits the two preferences by cost:

- **Theme (light / dark / auto) still syncs live, both ways
  (`components/preview/PreviewSyncBridge.tsx`).** Applying a colour scheme is
  synchronous and free (no token, no refetch), so the bridge keeps the two-way
  `postMessage` sync — guarded by `lastSyncedPrefsRef` so a value the shell just
  pushed is never echoed back.
- **Language is no longer synced over the bridge.** The frame already boots into
  the preview's pinned language from the embed URL (`language=<locale>`, see
  `providers/I18nProvider.tsx`), and the shell now changes the preview language by
  **remounting the iframe** at the new `language` param — never by pushing a
  locale the frame would have to `setLanguage` into. `applyPreferences` and the
  outbound report now carry the colour scheme only (`locale: null`). This removes
  the `setLanguage` call — and therefore the invalidation storm — from the live
  sync path entirely.
- **The mobile account language list is read-only inside the paired Live
  Preview.** Its token is intentionally GET-only and language-scoped, so trying
  to call the normal `/auth/set-language` flow could only fail and then refetch
  menu/page data outside the token scope. The list now shows "Controlled by the
  web preview"; the web pane's language selector is the single authority.
- **The bridge no longer announces READY before the mobile route exists.**
  Previously the shell immediately answered READY with `NAVIGATE(test)` while
  `GateController` was issuing its own initial `router.replace(test)`. Those
  competing startup replaces flooded Expo Router and triggered Chromium's
  navigation-throttling protection, leaving the frame permanently on "Starting
  up…". READY is now sent once, only after bootstrap and the requested initial
  page/modal are committed; the shell's reply is then a same-page no-op.
- The standalone (non-preview) app is unchanged: theme + language still come from
  stored choice → device locale, and the in-app language switcher still calls
  `setLanguage`.

### Off-menu pages open as a modal on direct navigation too

- **`app/(app)/[keyword].tsx`** now applies the same app-wide rule as in-app
  navigation (`usePageNavigation`): visiting an OFF-MENU page directly (typed URL,
  refresh, or deep link) presents it as a **modal sheet over home** instead of a
  full-screen dead end, so closing returns to the app. ON-MENU pages still route
  full-screen, and the Live Preview embed is exempt (its own router already owns
  the modal decision).

## 0.1.18

### Live Preview: the embedded frame can no longer hang on "Starting up…"

Fixes the long-standing CMS **Live Preview** symptom where clicking *reload*
(or toggling the mobile pane) left the embedded mobile frame stuck on the
"Starting up…" splash forever, while opening the same iframe URL in a fresh tab
loaded fine.

- **Server hydration now has a hard failsafe
  (`services/serverHydrationFailsafe.ts`, `providers/ServerProvider.tsx`).** The
  splash gate is `ready = serverHydrated && (!serverUrl || bootstrapped)`.
  `AuthProvider` already guaranteed `bootstrapped` flips within a ceiling, but
  nothing guaranteed `serverHydrated`: if `hydrateServerStore()` rejected (an
  exception before `setHydrated(true)`) or silently hung — a wedged dev
  preview-session exchange, or a background-tab `setTimeout` / Metro HMR hiccup
  on a rapid in-iframe reload — `serverHydrated` stayed `false` forever. The
  hydration promise is now wrapped with a `catch`/`finally` and an idempotent
  ceiling timer that always releases the splash. Internal-only; no API, schema,
  or bridge-contract change.

## 0.1.17

### Live Preview: shared theme + language with the web pane

The embedded mobile frame now mirrors the colour scheme and language of the CMS
**Live Preview** web pane, both ways.

- **Theme + language sync (`components/preview/PreviewSyncBridge.tsx`).** The
  bridge applies a `selfhelp-preview:set-preferences` push from the shell (flips
  `useThemeStore` and switches language via `setLanguage`, no reload) and reports
  a local change made in the mobile profile back with
  `selfhelp-preview:preferences-changed`, so changing dark/light or the language
  in either pane updates the other. A per-frame guard stops the two panes from
  ping-ponging. Requires `@selfhelp/shared >= 1.15.3`; pairs with frontend
  `>= 0.1.39`.

## 0.1.16

### Live Preview: off-menu pages open as a modal during synced navigation

Closes the gap where navigating the synced **Live Preview** to an off-menu page
showed it full-screen instead of as a modal.

- **Off-menu navigate commands open a modal (`components/preview/PreviewSyncBridge.tsx`).**
  An inbound `selfhelp-preview:navigate` from the shell now applies the **same
  app-wide rule as in-app navigation** (`components/shell/usePageNavigation.ts`):
  an **off-menu** keyword (footer-only / unassigned / headless / unknown, e.g.
  `impressum`) opens as a **modal sheet** over the current page instead of routing
  full-screen, while **on-menu** keywords still route full-screen. So clicking an
  off-menu page in the web pane now shows it as a modal in the mobile frame, exactly
  like the normal mobile app. The bridge reads the menu tree (`usePages`) to make
  the decision. Floor-neutral for the shell — the bridge message contract is
  unchanged (pairs with frontend `>= 0.1.38`).
- **No more web-only push-notification warnings (`providers/NativeBootstrap.tsx`).**
  Push registration and the notification-response listener are now skipped when the
  app runs on web (the CMS live preview), where `expo-notifications` only logs
  "not supported on web" noise and the listener is a no-op. Native iOS/Android push
  behaviour is unchanged.

## 0.1.15

### App-wide off-menu page modals, status-aware page errors, in-frame debug FAB

Generalises the preview-only "off-menu page opens as a modal" behaviour into
**core app navigation**, gives CMS pages the same not-found / no-access /
sign-in surfaces the web frontend shows, and restores the floating debug FAB
inside the embedded CMS **Live Preview** frame (pairs with frontend `>= 0.1.36`).

- **Off-menu pages open as a modal app-wide (`components/shell/usePageNavigation.ts`).**
  Every in-app navigation to a page **not on the navigation menu** (a `Button`
  or `Link` to a footer-only / unassigned / headless / unknown keyword) now opens
  it as a **modal sheet over the current page** instead of routing full-screen, so
  it is reachable in context and **closing returns to the previous page**. On-menu
  pages route full-screen exactly as before; external URLs / "open in new tab"
  still open in the OS. The preview-only store/host were renamed and generalised
  (`stores/previewModalStore.ts` → `stores/pageModalStore.ts`;
  `components/preview/PreviewModalHost.tsx` → `components/shell/PageModalHost.tsx`),
  and the Live Preview boot + sync bridge reuse the same mechanism.
- **Status-aware page errors (`components/renderer/CmsPageScreen.tsx`).** A failed
  page fetch now maps the backend HTTP status to the same states the web frontend
  shows — **404 → "Page not found"**, **403 → "Access denied"**, **401 → "Sign in
  required"** (anonymous 401/403 still bounce to login), and network / 5xx →
  retryable error. Because this screen also backs the modal host, a missing or
  forbidden page reads identically in the app and in both Live Preview panes.
- **In-frame debug FAB in the Live Preview (`components/dev/FloatingDebugPanel.tsx`).**
  The floating "D" debug button is shown again inside the embedded preview frame;
  only an explicit `hideDebugPanel=1` suppresses it — being embedded (`embed=1`)
  no longer hides it, so logs / queries / auth / server / info stay reachable
  while previewing.
- **Dark mode reads correctly on the page-state screens
  (`components/feedback/ErrorScreen.tsx`, `components/feedback/LoadingScreen.tsx`).**
  The not-found / no-access / sign-in / error and loading surfaces are now
  **theme-aware** (background, title, body, buttons, spinner follow the active
  scheme) instead of a black-on-dark title + grey button that looked broken in the
  dark device frame.
- **Language picker shown in the profile during embedded preview
  (`components/shell/LanguageSwitcher.tsx`).** The account sheet's language list is
  now visible inside the CMS **Live Preview** too — matching the normal app — so an
  editor can switch language from the mobile profile; the CMS toolbar's language
  control still works (both drive the same `setLanguage`, last action wins).

## 0.1.14

### CMS Live Preview sync bridge + draft banner

Adopts the `@selfhelp/shared >= 1.15.2` Live Preview bridge contract so the
embedded mobile preview stays on the **same page** as the web frame, and makes
draft mode unmistakable inside the device frame (supports the redesigned CMS
**Live Preview**, frontend `>= 0.1.35`).

- **Sync bridge (`components/preview/PreviewSyncBridge.tsx`).** When the frame is
  embedded with `previewShell=1`, it reports every in-app navigation up to the
  Live Preview shell (`selfhelp-preview:navigated`, with the page keyword) and
  accepts a `selfhelp-preview:navigate` command down from the shell — performing a
  **soft** Expo Router `replace` (no reload) so the mobile frame follows the web
  one and vice-versa. The shell owns the canonical page and ignores the echo of a
  command it just sent, so web↔mobile never ping-pong. Messages are only
  exchanged with the shell origin from `parentOrigin` (never `'*'`); web-only,
  native is a no-op.
- **`previewShell` / `parentOrigin` embed-contract params.** Parsed by
  `config/webPreviewContract.ts` (names sourced from the shared bridge contract);
  default off, so a non-synced embed is unchanged.
- **Draft banner (`components/preview/PreviewDraftBanner.tsx`).** A prominent
  orange **"PREVIEW MODE - This page shows draft content"** banner now renders at
  the top of the framed viewport whenever the preview is rendering draft content
  (`preview=true`), mirroring the web frame's banner so an editor can always trust
  which mode the rendered page is in.
- **Reload-safe embed runtime.** The initial validated iframe query is retained
  in versioned `sessionStorage`. After Expo Router removes the query from the
  visible route, a document reload or Fast Refresh module reset restores the
  preview session, backend override, draft/language settings, and bridge origin
  instead of dropping into the development server picker.

## 0.1.13

### Reload-resilient CMS Live Preview session + dark-mode login fix

Makes the in-browser mobile preview survive reloads and HMR (so the redesigned
CMS **Live Preview**, frontend `>= 0.1.34`, no longer bricks or freezes when a
frame reloads), and fixes the login accent in dark mode.

- **Preview session cached in `sessionStorage`.** The one-time `previewSession`
  code is single-use, so a live-reload / HMR refresh of the preview iframe used to
  re-exchange an **already-consumed** code and fail (a blank, dead pane). The
  exchanged short-lived scoped token is now cached in `sessionStorage` **keyed by
  the one-time code** (`services/mobilePreviewSession.ts`); a reload within the
  session reuses the cached token instead of re-exchanging, and only mints afresh
  when the CMS hands over a new code. `providers/ServerProvider.tsx` reads the
  cache before exchanging and writes it after. In-memory only for the browser
  preview tab; no token is persisted to disk and nothing changes for the native
  app.
- **Login submit button & links readable in dark mode.** The seeded neutral
  `dark`/`black` login accent (near-black) blended into a dark-mode background.
  `components/styles/auth/Login.tsx` now treats that accent **adaptively**,
  falling back to the theme primary in dark mode so the button and the
  reset/register links stay legible; light mode is unchanged.

## 0.1.12

### Off-menu pages open as a modal in the CMS Live Preview

Supports the new full-screen CMS **Live Preview** (frontend `>= 0.1.33`): a page
that is **not on the navigation menu** has no menu entry to reach it, so the
preview now presents it as a **modal sliding up over home** — immediately, on
boot — instead of routing to a bare full-screen page. On-menu pages are routed to
as before.

- **`modal` embed-contract param.** `config/webPreviewContract.ts` parses a new
  tri-state `modal` flag: `auto` (default) presents the keyword as a modal **only
  when it is off-menu** (no `navPosition` / headless); `on` always presents it as
  a modal (explicit override, e.g. a "preview in modal" button); `off` always
  routes full-screen. Unknown/blank values fall back to `auto`. The CMS frontend
  builder emits the matching `modal` param.
- **Boot presentation decision.** `app/_layout.tsx` resolves the presentation once
  per preview session; in `auto` it waits for the navigation pages so the
  on/off-menu decision is correct, then either opens the modal (off-menu) or
  routes to the keyword (on-menu).
- **`PreviewModalHost` + `previewModalStore`.** A dependency-light React Native
  `Modal` host (no third-party sheet) renders the off-menu page via the existing
  `CmsPageScreen` over home, with a title + close button; closing returns to home.
- **`isKeywordOnMenu` nav helper** added to `components/shell/navigationUtils.ts`
  and covered, with the `modal` parsing, by the contract unit tests.

## 0.1.11

### Mobile preview web image (`selfhelp-mobile-preview`)

Adds a dedicated **web-export build mode** so the Expo app can be served as the
in-browser mobile preview embedded by the CMS page editor. This is the mobile
half of the cross-repo Mobile Preview Service (core >= 0.1.19, `@selfhelp/shared`
>= 1.14.25, manager >= 1.6.5).

- **`APP_WEB_PREVIEW` build mode + embed contract.** `config/webPreviewContract.ts`
  is a pure, unit-tested parser for the iframe query string
  (`embed`, `keyword`, `device`, `orientation`, `frame`, `preview`,
  `previewSession`, `hideDebugPanel`, `banner`, `language`, dev-only `backendUrl`);
  `config/webPreview.ts` is the runtime accessor. The CMS builds this URL with the
  matching builder on the frontend side.
- **One-time code -> scoped JWT.** On boot the preview exchanges its
  `previewSession` one-time code via `POST /mobile-preview/session/exchange` for a
  short-lived, in-memory `purpose: 'mobile_preview'` JWT and talks to the private
  backend through a same-origin base — the admin token is never exposed.
- **Session-only dev overrides + keyword routing.** Device / orientation / preview
  flags from the embed URL are applied to the dev-mode store without persistence
  (hydration-safe), and the app routes to the requested page `keyword` on boot.
- **In-container static + proxy server** (`web-preview/server.mjs`) serves the
  Expo web export, exposes `/version.json` (image version + `mobileRendererVersion`
  + `bundledPlugins`) and `/healthz`, and proxies a narrow `/cms-api` allowlist to
  the backend so the backend stays private.
- **Curated plugin bundling.** `web-preview/preview-plugins.json` snapshots the
  official plugins baked into the image; `plugins-sync.mjs --snapshot` reads it at
  build time so listed plugins render natively (RN-on-web). Every other plugin
  falls back to `OpenOnWebFallback` (deep-link to the web frontend).
- **Release CI** (`.github/workflows/web-preview-release.yml`): builds + pushes
  the image, attaches SBOM/Trivy/cosign, emits the signed
  `mobile-preview-release.json` (incl. `bundledPlugins` + `mobileRendererVersion`)
  + `release-manifest.json`, and `repository_dispatch`es the registry to auto-stage
  the release. The descriptor now also emits **top-level**, range-cleaned
  `reactNativeVersion` / `expoSdkVersion` (alongside the raw `builtFrom.*`
  provenance), matching `@selfhelp/shared` `MobilePreviewRelease` (>= 1.14.26) and
  the registry schema — so the manager's dual-axis plugin gate reads them on both
  the auto-staging AND the manual `assemble-release --from` publish path.
- **Preview session exchange uses the shared contract.**
  `services/mobilePreviewSession.ts` now imports `MOBILE_PREVIEW_ENDPOINTS.EXCHANGE`
  and `IMobilePreviewExchangeResponse` from `@selfhelp/shared` instead of a local
  path constant + ad-hoc envelope type, so the one-time-code → scoped-JWT exchange
  stays in lockstep with the backend contract.

## 0.1.10

### Fix anonymous page load: stop the `preview=true` 401 loop, reach login again

Adapts the client to the backend anonymous-access hardening (core >= 0.1.18),
which now rejects an anonymous `preview=true` request with `401`. Two coupled
fixes so the app loads cleanly and can always reach the login screen:

- **Preview is gated on authentication** (`services/previewPolicy.ts` +
  `usePageContent`). The dev-only preview toggle is ignored until the user has a
  token, so the public `home` / `login` screens fetch published content (200)
  instead of a draft (401). Previously every launch fired `home?preview=true`
  (and, after a redirect attempt, `login?preview=true`) and got a 401.
- **A mid-session 401 no longer resets the auth-bootstrap flag.**
  `useAuthStore.clear()` and `clearAuthSession()` now preserve `bootstrapped`
  (only an explicit server switch resets it via
  `clearAuthSession({ resetBootstrap: true })`). Resetting it on every 401
  re-ran the bootstrap, remounted the gated Stack, and refetched the page query
  → 401 → clear → bootstrap → … an infinite loop that never let `CmsPageScreen`
  settle into its error→login redirect. Now a genuine 401/403 surfaces, the
  screen redirects to `/(public)/login`, and the loop is gone.

## 0.1.9

### Dark-mode parity for the remaining auth + form renderers

The cross-repo style audit (2026-06-22) found five renderers that bypassed the
theme seam and re-inlined hard-coded hex, so they rendered black-on-dark
(illegible) in dark mode. All now use the adapter seam / `useAppColors`, matching
`Login`, `Register` and `RichTextEditor`. Re-verify in light + dark.

- **`components/styles/auth/ResetPassword.tsx`, `Validate.tsx`,
  `TwoFactorAuth.tsx`.** Migrated from raw `TextInput`/`Pressable` to the HeroUI
  Native adapter seam (`MobileText` + `MobileInput` + `MobileButton`). Titles,
  inputs (themed text + border + background) and submit buttons are now legible in
  dark mode; the submit button honours the authored colour (`color` on
  reset-password, `btn_save_color` on validate) through the shared variant
  resolver, exactly like `Login`.
- **`components/styles/auth/CommunicationPreferences.tsx`** (rendered inside
  `Profile`). Title / description / labels / error text now read `useAppColors`
  instead of defaulting to black, so the Profile screen is fully legible in dark
  mode.
- **`components/styles/forms/FileInput.tsx`.** Filename text, placeholder, dashed
  border and the remove (×) control are themed via `useAppColors` (were
  `#212529` / `#868e96` / `#adb5bd`). Still images-only (`expo-image-picker`);
  generic documents remain a deferred follow-up.
- **`components/styles/typography/Fieldset.tsx`** (border + legend) and
  **`components/styles/forms/Rating.tsx`** (empty-star colour) moved off
  hard-coded `#dee2e6` to theme tokens.
- **`components/styles/media/ImageStyle.tsx`.** Dropped the dead `width`/`height`
  field reads (no such DB fields — image sizing is web-only `web_width` /
  `web_height`), matching the `IImageStyle` cleanup in `@selfhelp/shared` 1.14.23.

## 0.1.8

### Select multi-select + bottom-sheet theming, nicer timeline

Live verification surfaced three mobile issues; all fixed and re-verified in
light + dark. Requires `@selfhelp/shared` ≥ 1.14.19.

- **`components/ui/adapters/oss/MobileSelect.tsx`.** Now supports multi-select
  (`multiple`, from the CMS `is_multiple` field) via HeroUI Native's
  `selectionMode="multiple"`; the contract value is a comma-separated list. The
  trigger renders the selected label(s) through a themed `Text` instead of
  `Select.Value`, so the current selection is always visible (single **and**
  multiple) — previously a multi-select showed nothing. The `bottom-sheet`
  presentation now pins a theme-aware background + handle and themes the item
  labels: HeroUI's `@gorhom/bottom-sheet` container does not pick up the Uniwind
  dark class on `react-native-web`, so the list painted white-on-white (invisible
  options) in dark mode.
- **`components/styles/forms/Select.tsx`.** Reads `is_multiple` and forwards
  `multiple` to the adapter (`Combobox.tsx` reuses this renderer).
- **`components/styles/composite/Timeline.tsx` + `TimelineItem.tsx`.** Redesigned
  the OSS timeline: each item draws a centered rail (themed dot + connecting
  line) beside its content, so the markers stay aligned and the line connects to
  the next item regardless of content height. Colours come from `useAppColors`
  (was a hard-coded `#228be6` dot and a pale, disconnected `#dee2e6` rail that
  looked broken in dark mode).

## 0.1.7

### Mobile-only (HeroUI Native) style capabilities

Renders the new `mobile_*` CMS fields (backend migration `Version20260622145334`,
`@selfhelp/shared` ≥ 1.14.18) — HeroUI Native props that have no web/Mantine
equivalent, so authors tune the native look from the CMS. Verified open → select
→ close and theme legibility on Expo-web in light **and** dark.

- **`components/ui/adapters/oss/MobileSelect.tsx`.** Rewritten to use HeroUI
  Native's real overlay (`Select.Portal` + `Select.Overlay` + `Select.Content`)
  with a configurable `presentation` — `bottom-sheet` (default), `dialog`, or
  `popover` — replacing the `0.1.6` React Native `Modal` workaround. The
  `bottom-sheet` / `dialog` presentations are portal-based, so they open reliably
  on `react-native-web` (HeroUI's `popover` still relies on `View.measure()`,
  offered only as an explicit opt-in). `onValueChange` is simplified for the
  single-selection contract.
- **`components/styles/forms/Select.tsx`.** Reads the label from the linked
  `label` field (was the now-unlinked `alt` field, so the label was blank) and
  passes `mobile_select_presentation` through to `MobileSelect`.
  `components/styles/forms/Combobox.tsx` reuses this renderer, so it inherits the
  presentation field automatically.
- **`components/styles/interactive/Button.tsx` + `MobileButton.tsx`.** Reads
  `mobile_button_feedback` and forwards it as HeroUI Native `feedbackVariant`
  (`scale-highlight` default, `scale-ripple`, `scale`, `none`). The adapter
  switches on the literal value to satisfy HeroUI's discriminated-union prop type.
- **`components/styles/forms/Slider.tsx` / `RangeSlider.tsx`.** Read
  `mobile_slider_show_value` / `mobile_range_slider_show_value` (default on) and
  conditionally render the `HeroSlider.Output` value bubble.
- **`components/styles/forms/TextInput.tsx` / `Textarea.tsx` + `MobileInput.tsx` /
  `MobileTextarea.tsx`.** Read `mobile_input_variant` / `mobile_textarea_variant`
  and forward HeroUI Native `variant`, plus theme-aware `borderColor` /
  `backgroundColor` (primary = bordered, secondary = filled `surfaceMuted`) so the
  variant is visible on `react-native-web`, where HeroUI's shadow-based borders
  don't paint.
- **`components/styles/forms/Checkbox.tsx` + `MobileCheckbox.tsx`.** Read
  `mobile_checkbox_variant` and forward it as HeroUI Native `variant`.

## 0.1.6

### Interactive renderers: working `select`, `datepicker`, `color-input`, `tabs`

Live Expo-web verification surfaced four interactive renderers that did not
function on mobile: the `select` dropdown never opened, `datepicker` /
`color-input` had no picker, and `tabs` opened with nothing selected. All four
now work and stay theme-aware in both schemes.

- **`components/ui/adapters/oss/MobileSelect.tsx`.** Keeps the HeroUI Native
  `Select` trigger/value/item for styling but renders the option list in a React
  Native `Modal` instead of HeroUI's popover. HeroUI's `Select.Content` positions
  itself from `View.measure()`, which never resolves on `react-native-web`, so the
  list stayed unmounted (nothing opened). The modal uses a `colors.backdrop`
  scrim and a `colors.surface` sheet.
- **`components/styles/forms/DatePicker.tsx`.** Renders a native
  `<input type="date">` on web (themed via inline styles + `colorScheme`) for a
  real calendar picker; native platforms keep the themed `MobileInput` ISO-date
  fallback.
- **`components/styles/forms/ColorInput.tsx`.** Renders a native
  `<input type="color">` swatch synced to a themed hex `MobileInput` on web;
  native platforms show a themed swatch beside the hex input. Values normalise
  through `colorToHex`, and the whole control is theme-aware (was hard-coded
  light).
- **`components/styles/composite/Tabs.tsx`.** Defaults the active tab to the
  first `tab` child's `id` (state was an index `0` compared against position-based
  ids, so nothing was selected). Renders a horizontal label strip
  (`ScrollView` of `Pressable`) above a separate full-width content panel, with
  the active label/underline tinted from `shared_color`.
- **`components/styles/composite/Tab.tsx`.** Now a standalone fallback (no
  `TabsContext`): renders its interpolated label + children stacked, so it still
  shows content when used outside a `Tabs` container.

### Dark-mode + `shared_color` fixes across the form/interactive renderers

Live Expo-web verification of the `qa-style-showcase` page in dark mode surfaced
seven renderers that painted with literal hexes (white-on-dark surfaces, an
ignored authored accent, or invisible labels). All now resolve colour through
theme tokens (`useAppColors`) or the shared `colorToHex` mapper so the style is
legible in both schemes and the cross-platform `shared_color` is honoured on
mobile exactly like on web.

- **`components/styles/forms/NumberInput.tsx`.** Renders through
  the themed `MobileInput` adapter instead of a raw `RNTextInput`, so the
  field surface/border/text follow the colour scheme (was a white box in dark).
- **`components/ui/adapters/oss/MobileSwitch.tsx` + `components/styles/forms/Switch.tsx`.**
  `MobileSwitch` gained an optional `selectedColor`; `Switch` resolves
  `shared_color` → hex and feeds the HeroUI Native `animation.backgroundColor`
  `[off, on]` tuple (off = theme `border`), so the "on" track honours the
  authored accent (was always blue). `selectedColor` is declared as a local
  module augmentation of `IMobileSwitchProps` in
  `components/ui/adapters/types.ts` until it lands in `@selfhelp/shared`.
- **`components/styles/forms/Slider.tsx` / `RangeSlider.tsx`.** Tint
  `HeroSlider.Fill` from `shared_color` (was always blue).
- **`components/styles/forms/Radio.tsx`.** Option labels use `colors.text`
  (were invisible in dark), the selected circle uses the `shared_color` accent,
  and the unselected ring uses `colors.textFaint`.
- **`components/styles/forms/Progress.tsx` / `ProgressRoot.tsx`.** Track uses
  `colors.surfaceMuted` instead of a hard-coded `#e9ecef` (was a light bar on a
  dark page).

### Form capability pass: text-input / textarea keyboard knobs + progress radius

The mobile `text-input` and `textarea` renderers now honour the new
cross-platform `shared_max_length` and the `mobile_*` native keyboard knobs, and
`progress-root` honours `shared_radius`. Requires `@selfhelp/shared` ≥ 1.14.17.

- **`components/ui/adapters/oss/MobileInput.tsx` / `MobileTextarea.tsx`.** Pass
  through the new `maxLength` + `autoCapitalize` adapter props (input also already
  forwarded `secureTextEntry` + `keyboardType`).
- **`components/styles/forms/TextInput.tsx`.** Reads `shared_max_length`
  (`maxLength`), `mobile_keyboard_type` (`keyboardType`), `mobile_auto_capitalize`
  (`autoCapitalize`), `mobile_secure_entry` (`secureTextEntry`).
- **`components/styles/forms/Textarea.tsx`.** Reads `shared_max_length` +
  `mobile_auto_capitalize`.
- **`components/styles/forms/ProgressRoot.tsx`.** Reads `shared_radius` (maps to
  the bar's `borderRadius` via the shared `RADIUS_PX` token), mirroring the
  single `progress` renderer.

### Inline rich-text reaches mobile (text style)

CMS inline formatting (bold / italic / underline / link) authored on the web now
renders on the mobile app — the cross-platform goal. React Native `<Text>` cannot
render HTML, so the `text` renderer parses the safe inline subset and renders
nested `<Text>` runs instead of stripping the markup to plain text.

- **`components/renderer/InlineText.tsx` (new).** Renders a list of inline runs
  as one `<Text>` with nested `<Text>` children carrying `fontWeight` /
  `fontStyle` / `textDecorationLine`; anchor runs open via `Linking`. The base
  typography (size/colour/align) stays on the outer `<Text>`.
- **`components/renderer/sanitizeContent.ts`.** Added `parseInlineRich`,
  `hasInlineFormatting`, and the `IInlineNode` type — behaviour-identical local
  copies of the `@selfhelp/shared` 1.14.14 `content` helpers (same transitional
  pattern as `stripHtmlToText`). Block tags + `<br>` collapse to spaces; JSON
  payloads pass through untouched.
- **`components/renderer/useField.ts`.** Added `useInlineFormattedField`, the
  inline-aware sibling of the stripping `useInterpolatedField`.
- **`components/styles/typography/TextStyle.tsx`.** Renders `<InlineText>` from
  the parsed runs (was a stripped plain `<Text>`).
- **Tests.** `__tests__/unit/sanitizeContent.test.mjs` now also covers
  `parseInlineRich` / `hasInlineFormatting` (15 assertions total, green).
- **`blockquote` + `list-item` too.** `Blockquote.tsx` (dedicated
  `blockquote_content`) and `ListItem.tsx` (`list_item_content`) also render the
  inline subset via `<InlineText>` instead of stripping it.

### Mobile rich-text editor (lightweight toolbar)

The `rich-text-editor` style is now an actual editor on mobile instead of a raw
HTML `TextInput`. A themed toolbar applies the same safe inline subset the
renderers understand, so what an author formats is what the page shows.

- **`components/styles/forms/RichTextEditor.tsx`.** Rebuilt with a Bold / Italic
  / Underline / Link toolbar over a themed source field plus a live `<InlineText>`
  preview. All colours come from `useAppColors` (readable in light and dark).
- **`components/styles/forms/richTextMarkup.ts` (new).** Pure, RN-free helper
  that wraps the current selection in `<strong>` / `<em>` / `<u>` / `<a>` and
  reports the new selection — unit-tested under `node --test`.
- **`components/styles/forms/_FieldShell.tsx`.** Error text uses `colors.danger`
  (was a hardcoded red).
- **Tests.** `__tests__/unit/richTextMarkup.test.mjs` (new) covers the wrapping,
  empty-selection, clamping, and round-trip cases.

### Text / media / interactive field pass

Mobile renderers now read the new fields added by backend migration
`Version20260622110041`:

- **`image`** — `fallback_src` is shown when the main source can't load. Failure
  is detected deterministically with `Image.prefetch` (reliable on web + native,
  unlike expo-image's `onError`), then the fallback is rendered.
- **`figure`** — optional built-in `img_src` / `alt` (no child section needed).
- **`link`** — `shared_color` accent (lightened on dark) + underline.
- **`action-icon`** — `aria_label` drives the accessible name.
- **`spoiler`** — `shared_color` control colour.
- **`audio`** / **`video`** — `has_controls` / `media_loop` / `media_autoplay`
  (+ `media_muted` for video) playback toggles; `video` reads `video_src`.

### Carousel renders child sections as slides

`components/styles/media/Carousel/*` — the carousel paged an empty `sources`
field and therefore rendered nothing. It now pages through its **child sections**
(rendered via `BasicStyle`, mirroring the web `CarouselStyle`), measures the
container width with `onLayout` so snapping aligns, and themes the active /
inactive dots with `useAppColors`. Swipe + prev/next arrows verified.

### Dark-mode polish

Replaced hardcoded light colours that looked wrong on dark backgrounds with
`useAppColors` tokens: `Kbd` (surface/border/text), `Highlight` (surrounding
text + dark ink on the light marker), `Indicator` (badge ring now matches the
page background instead of glaring white), the carousel dots, and the
`video`/`audio` empty states.

## 0.1.5

### Layout styles cross-platform pass (box, container, paper, center, group, stack, flex, grid, grid-column, simple-grid, space, divider, scroll-area)

Aligns the mobile layout renderers with backend migration `Version20260622063129`
and `@selfhelp/shared` `1.14.13`. The layout styles carried most sizing/behaviour
under `web_*`, so on mobile they were barely configurable (and several renderers
read field names the migration renamed, so they had silently stopped working).
Every portable property now reads the promoted `shared_*` field through the shared
mapper.

- **Sizing helper (`components/styles/layout/_sizing.ts`, new).** Reads the
  cross-platform `shared_width`/`shared_height` (and `center`'s
  `shared_miw`/`shared_mih`/`shared_maw`/`shared_mah`) through the shared
  `parseDimensionToReactNative` mapper, so a CMS px string ("320px") becomes a
  unitless RN number while `%`/`auto` stay strings. Consumed by `flex`, `group`,
  `stack`, `grid`, `grid-column`, `center`, `simple-grid` (width+height) and
  `scroll-area` (height).
- **`paper` (`Paper.tsx`).** Dark-mode fix — the surface was a hard-coded
  `#ffffff` background with an `#e9ecef` border (white-on-dark in dark mode); it
  now paints `useAppColors().surface` + `.border`. Renders the new optional
  auto-styled `title` heading above the children (themed text, HTML-stripped, only
  when set, never creating a section). Border opts in via `shared_border`
  (was the broken `border`/`web_border`).
- **`grid-column` (`GridColumn.tsx`).** Was reading the renamed `web_grid_span`
  (broken). Now maps `shared_grid_span` through the shared
  `gridSpanToReactNativeColumn` mapper, plus `shared_grid_offset` (left margin) and
  `shared_grid_grow`. `shared_grid_order` has no RN flexbox equivalent (web-only).
- **`simple-grid` (`SimpleGrid.tsx`).** Was reading the renamed `web_cols` and a
  non-existent `web_spacing` (broken). Now uses `shared_cols`, `shared_gap`
  (column gutter) and `shared_vertical_spacing` (row gutter), with a border-box
  gutter so a row sums to exactly 100% (no horizontal overflow).
- **`divider` (`Divider.tsx`).** Was reading the renamed `divider_variant` /
  `divider_label_position` (broken). Now uses `shared_divider_variant` (through the
  shared `mapDividerVariantToReactNative` mapper) and `shared_divider_label_position`,
  and lightens the line colour in dark mode (falls back to the theme border).
- **`space` (`Space.tsx`).** Was reading the renamed `web_space_direction` (broken);
  now reads `shared_orientation`.
- **`scroll-area` (`ScrollArea.tsx`).** Was reading the renamed `web_height` with a
  raw `Number()` parse (broken for px/%); now reads `shared_height` through the
  shared mapper.
- **`flex` / `group` / `stack` / `grid` / `center`.** Gained the cross-platform
  width/height (center also min/max) via the sizing helper.
- **`css_mobile` colour lockstep (via `@selfhelp/shared` `1.14.13`).** The web
  `css`/`css_mobile` dropdown offers the standard Tailwind colour scale
  (`bg-blue-500`, `text-white`, …), but those names are oklch-based and unknown to
  the RN/Uniwind preset, so colour demos on the showcase page rendered with **no
  background** on mobile. The shared classifier now remaps the standard scale onto
  the hex-backed Mantine scale (`bg-blue-500` → `bg-blue-6`, `bg-gray-100` →
  `bg-gray-1`, Tailwind-only `purple`/`fuchsia` → `grape`), allows `text-white` /
  `text-black`, and drops web-only `hover:`/`focus:` state classes. No mobile code
  changed — `cssMobileToUniwind` picks it up through the shared bump — but the
  author's dropdown colour picks now actually paint on Expo/RN. Locked in by new
  cases in `__tests__/unit/sectionClasses.test.mjs`.

## 0.1.4

### `card` / `card-segment` / `checkbox` / `chip` / `code` / `title` / `register` style-polish wave

Aligns the mobile renderers with the backend `Version20260619191224` field wave
and `@selfhelp/shared` `1.14.10`. Field-name promotions, new cross-platform
config, dark-mode fixes, and a HeroUI-Native-first `register` rebuild.

- **`card` (`components/styles/layout/Card.tsx`).** Renders the new optional
  auto-styled content fields: a cover `img_src` image (resolved via
  `resolveAssetUrl`) and a themed `title` heading above the child sections — both
  only when set, never creating a child section. The HeroUI Native `Card` surface
  already themes for dark/light.
- **`card-segment` (`CardSegment.tsx`).** Dark-mode fix: the segment divider was
  a hard-coded `#f1f3f5` (white-ish, invisible/wrong on dark). It now opts in via
  the new `shared_border` field and paints the divider with `useAppColors().border`
  so it is correct in both themes. `web_segment_inherit_padding` is web-only and
  intentionally not read.
- **`checkbox` (`Checkbox.tsx` + `MobileCheckbox` adapter).** Honours the promoted
  `shared_label_position` on mobile (was web-only) through the new additive
  `IMobileCheckboxProps.labelPosition` (`@selfhelp/shared` 1.14.10); `left` places
  the label before the box (`flex-row-reverse`).
- **`chip` (`Chip.tsx`).** The resting (unselected) look now honours
  `shared_chip_variant` (renamed from `web_chip_variant`) via the new shared
  `mapChipVariantToHeroUiVariant` (filled→primary / light→soft / outline→tertiary);
  selection still emphasises with `primary`.
- **`code` (`Code.tsx`).** `web_code_block` → `code_block`; added `shared_radius`
  (rounds the block surface via `RADIUS_PX`).
- **`title` (`Title.tsx`).** `web_title_order` → `title_order`; added `shared_color`
  (resolved to a themed accent hex via `resolveMantineVariant`) and
  `shared_line_clamp` (renamed from `web_title_line_clamp`, maps to RN
  `numberOfLines`).
- **`register` (`auth/Register.tsx`) — HeroUI-Native-first rebuild + dark-mode fix.**
  Replaced the raw `TextInput`/`Pressable`/`Text` (hard-coded `#dee2e6`/`#228be6`/
  `#fff`, invisible/wrong on dark) with the `MobileText`/`MobileInput`/`MobileButton`
  adapters, themed via `useAppColors`. Aligned the fields to the CMS contract
  (email + optional validation code, hidden when `open_registration` is on — the
  bogus "Name" field is gone) and drove the submit accent from the configurable
  `shared_color`, matching the web `register` + mobile `login`.
- **`register` submission fix — `page_id` is now sent.** The rebuilt form posted
  only `{ email, code? }`, so `POST /auth/register` failed schema validation with
  `Field 'page_id': The property page_id is required` (the backend needs it to
  locate the register section + open-registration policy, exactly like the web
  renderer). `PageRenderer` now seeds the current `page_id` into the interpolation
  `values`, and `Register` reads it and includes it in the payload (guarding the
  missing-id case). (`components/renderer/PageRenderer.tsx`,
  `components/styles/auth/Register.tsx`)

## 0.1.3

### `accordion` / `accordion-item` HeroUI Native rebuild
- **The accordion is rebuilt on the HeroUI Native `Accordion` compound**
  (`Accordion` / `.Item` / `.Trigger` / `.Indicator` / `.Content`) — themed,
  animated, with separators — replacing the hand-rolled `View`/`Pressable`/`Text`
  implementation and its custom open-state context
  (`components/styles/composite/Accordion/Accordion.tsx`,
  `components/styles/composite/AccordionItem.tsx`).
- **Dark-mode fix.** The old renderer used a hard-coded `#e9ecef` border and an
  uncoloured `<Text>` (black, invisible on dark). Text colours now resolve
  through `useAppColors()` and the surfaces/animations through the theme-aware
  HeroUI components, so the accordion is legible in light + dark.
- **More cross-platform config.** The mobile accordion now honours
  `shared_accordion_variant` (via `@selfhelp/shared`
  `mapAccordionVariantToHeroUiVariant` → HeroUI `default`/`surface`) and
  `shared_radius` (surface container radius), in addition to `shared_multiple`.
- **Optional item subtitle.** `accordion-item` renders the new `description`
  content field as a muted subtitle under the label. Requires `@selfhelp/shared`
  `1.14.8`.

## 0.1.2

### `alert` / `badge` / `avatar` / `login` style-polish wave
- **Alert is now dismissible on mobile.** The `web_with_close_button` field was
  renamed to the cross-platform `closable` (common scope) in the backend, so the
  mobile `Alert` renderer now honours it: when set it shows a themed `×` dismiss
  button that hides the alert (`components/styles/interactive/Alert.tsx`),
  matching the web close button.
- **Badge `circle` variant.** New cross-platform `circle` boolean renders a
  fixed-diameter dot (counts / single initials) instead of the default pill
  (`components/styles/interactive/Badge.tsx`). Variant/colour keep flowing
  through the shared mapper (`shared_variant` / `shared_color`).
- **Avatar auto-initials from `name`.** The `Avatar` renderer now derives its
  fallback initials from the new `name` field (first letter of the first two
  words), mirroring the web Mantine `name` behaviour, before falling back to the
  explicit initials fields. Extracted the pure helper into
  `components/styles/interactive/avatarInitials.ts` with a focused
  `__tests__/unit/avatarInitials.test.mjs` suite (the `node --test` harness
  cannot import `.tsx`).
- **Login rebuilt HeroUI-Native-first + `subtitle` + dark-mode fix.** The mobile
  `Login` renderer (`components/styles/auth/Login.tsx`) was rewritten to compose
  from the HeroUI Native adapter seam — `MobileText` (title/subtitle),
  `MobileInput` (`TextField`+`Label`+`Input` for email/password) and
  `MobileButton` (`Button`) — instead of raw `TextInput`/`Pressable`, following
  the style command's component-selection priority (HeroUI Native → Expo/RN →
  custom). It renders the new optional `subtitle` content field, marks the inputs
  `isInvalid` on a failed login, and every colour now resolves through theme
  tokens (`useAppColors` + Uniwind), fixing dark-mode legibility (the previous
  hard-coded `#228be6`/`#dee2e6`/`#fff` hexes are gone). Also fixed the title
  field read: the renderer now reads `login_title` (the real field name in the
  `ILoginStyle` contract and the web renderer) instead of the non-existent
  `label_title`, so the optional title actually renders.
- The mobile `Button` renderer already read `url` / `page_keyword` and resolved
  its variant via the shared mapper (`shared_variant`), so it needed no change in
  this wave. These renderers read the new/renamed fields by name through the
  existing shared mapper; the fields themselves ship in the backend `0.1.15`
  style-schema contract (migration `Version20260619131830`).
- **Aligned `@selfhelp/shared` to the published `1.14.7`** (was `^1.14.5` with a
  stale, never-published `1.15.0` lingering in `node_modules`) so the mobile app
  and the web frontend now consume the exact same published contract version.
  `1.14.7` adds the `IMobileButtonProps.accentColor` passthrough used below.

### Adapter & login polish (HeroUI Native on `react-native-web`)
- **Visible input borders.** `MobileInput` and `MobileTextarea`
  (`components/ui/adapters/oss/`) now set an explicit themed `borderColor` /
  `backgroundColor` / text + placeholder colour via the `style` prop. HeroUI
  Native separates inputs with a shadow that `react-native-web` does not draw, so
  the login fields looked border-less; the explicit theme-aware border (from
  `useAppColors`) fixes that on web and mobile, in light and dark.
- **Authored button colour on mobile (`shared_color`).** `MobileButton` gained an
  `accentColor` passthrough (the shared `1.14.7` contract) that overrides the
  HeroUI variant fill while keeping the readable foreground. The `Login` renderer
  resolves `shared_color` to a concrete accent via the shared
  `resolveMantineVariant(...).accent` and feeds it to **both** the submit button
  (`accentColor`) and the "Forgot password?" / "Create account" links, so the
  authored colour now applies on mobile (it previously only worked on web) and the
  button and its links stay consistent. The links open the headless
  `reset-password` / `register` pages in a modal (`LoginAuxModal`).

### Content sanitization (single global chokepoint)
- **All interpolated display text is sanitized.** `useInterpolatedField`
  (`components/renderer/useField.ts`) now runs every value through
  `stripHtmlToText` (`components/renderer/sanitizeContent.ts`) after
  interpolation, so leaf renderers can never show raw `<p>`/HTML. The sanitizer is
  **JSON-aware** — values that parse as JSON are left intact so structured content
  fields survive. Covered by `__tests__/unit/sanitizeContent.test.mjs` (+ updated
  `useField.test.mjs`).

### Dark-mode legibility across renderers
- **Renderers resolve authored colours through theme tokens.** Typography
  (`TextStyle`, `Title`, `Blockquote`, `Code`), layout (`Divider`), media
  (`Figure`), interactive (`Notification`), composite (`ListItem`,
  `TimelineItem`), forms (`SegmentedControl`, `_FieldShell`) and the auth
  surfaces (`Profile`, `SystemSurfaces`) now derive colours from `useAppColors`
  (lighter palette shade on dark backgrounds, theme text token as the default)
  instead of hard-coded near-black hexes, fixing dark-mode legibility.

### Dev experience
- **Suppress the benign `[colorKit.RGB]` warning.** HeroUI Native's colour
  parser logs `[colorKit.RGB] An error occurred …` on `react-native-web`, which
  Expo surfaced as a stuck, un-closable LogBox toast. Added a `BENIGN_PATTERNS`
  entry in `config/devWarnings.ts` so it is filtered before reaching the console /
  LogBox.

## 0.1.1

### Theme selector, account sheet, and themed debug tree
- **Three-way colour scheme (`light` / `dark` / `auto`).** New `stores/themeStore.ts`
  (persisted via `secureStore`) drives `Uniwind.setTheme` from `ThemeProvider`,
  defaulting to `auto` (follow the OS). New `hooks/useAppColors.ts` exposes a
  semantic palette (tracking HeroUI Native's light/dark tokens) so inline-styled
  app chrome — header, drawer, bottom tabs, sheets, debug panels — repaints with
  the theme alongside HeroUI content. The status bar follows the resolved scheme.
- **Account sheet replaces a crowded header.** `AppHeader` is now a slim
  hamburger + app name + single account button (avatar / gear). It opens
  `components/shell/AccountMenu.tsx`, a bottom sheet holding the appearance
  selector, a compact language picker, "View profile" (opens the CMS `profile`
  page in `ProfileModal` without navigating away), a dev-only server switch, and
  log in / log out. `LanguageSwitcher` was reworked into the compact list.
- **Collapsible debug JSON tree.** The `__DEV__` section debug modal renders the
  raw section as an expandable, colour-coded tree (`components/dev/JsonTree.tsx`)
  mirroring the web frontend's inspector, and the whole modal is theme-aware.
- **Quieter web preview.** `config/devWarnings.ts` suppresses the benign
  `react-native-web` prop warnings (e.g. `importantForAccessibility`) that the
  Expo LogBox overlay was stacking on top of the UI on web. Dev-only; native and
  production builds are unaffected.

### Mobile CMS rendering plan — adapter contract & functional controls
- **Single-source mobile UI adapter contract.** Bumped `@selfhelp/shared` to
  `^1.11.0`, which now owns the adapter contract (`IMobileUiAdapters` +
  `IMobile*Props`). `components/ui/adapters/types.ts` re-exports it (keeping only
  the build-tier helper `getMobileUiTier` local), and the private
  `@selfhelp/mobile-pro-ui` package consumes the same source — no more
  hand-synced copies (mobile rendering plan 8.3 / 9).
- **Per-capability Pro composition.** `components/ui/adapters/index.ts` composes
  the active set as `ossAdapters + proOverrides` (`composeMobileAdapters`), so a
  Pro build overrides only the capabilities it improves and every other
  capability keeps its open-source fallback. Added `tsconfig.pro.json` +
  `npm run typecheck:pro` so the app is type-checked against the Pro adapter set
  too (cross-repo drift guard).
- **`mobileStyleProps` reads `shared_*` only.** The legacy `web_*` fallback was
  removed (plan 6.3): mobile resolves the narrowed `shared_*` scales
  (`sm|md|lg`, `none..full`) through the shared semantic mapper and never reads a
  web field.
- **Functional form controls (no more placeholders, plan 11.6).** `slider` and
  `range-slider` now use the HeroUI Native `Slider` compound (draggable single
  and two-thumb range, value parsed/serialised via `_sliderValue.ts`);
  `file-input` uses `expo-image-picker` and enforces the CMS accept/size
  constraints before upload (`_fileValidation.ts`); `rich-text-editor` is now an
  editable source field with a live HTML preview (documented subset) that
  preserves submitted data. The read-only rich-text viewer was removed.

### HeroUI (mobile) / Mantine (web) style architecture
- **One style name, two renderers.** A CMS style now renders a Mantine component
  on web and a HeroUI Native component on mobile, with no platform-named styles in
  either renderer. The web frontend's duplicate `mantine/heroui/` folder (13
  renderers + a local `intentColor.ts`) was removed; those styles are plain
  Mantine renderers again, and color/intent mapping comes only from the shared
  mapper.
- **Three-bucket field model.** Cross-platform semantic fields (`size`, `spacing`,
  `radius`, `intent`, state booleans, `full_width`) are shared/unprefixed and
  resolved per-platform by `@selfhelp/shared/src/theme/semantic.ts`
  (`resolveSharedStyleForWeb` / `resolveSharedStyleForMobile`); `web_*` configures
  Mantine-only extras and `mobile_*` configures HeroUI-only extras.
- **Mobile reads through the mapper.** Interactive styles (`button`, `badge`,
  `chip`, `avatar`, `alert`, `action-icon`, `theme-icon`, `indicator`,
  `notification`) and layout/typography styles (`card`, `paper`, `divider`,
  `container`, `simple-grid`, `image`, `background-image`, `fieldset`, `text`,
  `progress`) now read shared fields via `components/ui/mobileStyleProps.ts`
  (shared → legacy `web_*` fallback) instead of reading `web_*` directly. Added
  `mobileIntentPalette()` for a consistent clean-RN fallback palette derived from
  `intent`.
- **Pro tier = OSS fallback only for Pro components.** Free styles render via
  `heroui-native`; Pro-tier components HeroUI Native doesn't ship (e.g. `badge`,
  `theme-icon`, `indicator`, `notification`) render clean React Native fallbacks,
  with the polished versions reserved for `@selfhelp/mobile-pro-ui` behind the
  adapter contract.

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
