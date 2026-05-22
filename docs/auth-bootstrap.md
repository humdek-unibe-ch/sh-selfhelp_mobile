/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
# Auth, Bootstrap, and Live Updates

## Boot Order

Cold starts and browser reloads MUST NOT start CMS requests until the
server URL and the auth bootstrap are settled. The order is fixed:

1. **`ServerProvider`** restores the selected server. In production
   builds the URL is baked into `runtimeConfig.bakedBackendUrl`; in
   dev/preview it is read from
   `SECURE_STORE_KEYS.SERVER_URL` (`expo-secure-store` on native,
   `localStorage` on Expo Web). When this finishes
   `useServerStore.hydrated` flips to `true`.
2. **`QueryProvider`** mounts a single `QueryClient`. Persisted queries
   share a `QUERY_CACHE_BUSTER`; auth-scoped keys (`pages`, `page`,
   `user-data`) include the server URL and the auth scope (`auth` /
   `anon`) so cache entries from the wrong tenant or the wrong identity
   can never serve.
3. **`AuthProvider`** waits for `useServerStore.hydrated`. If a server
   exists, it calls `refreshAccessToken()` (the shared singleton) which:
    - reads the persisted refresh token,
    - POSTs `/cms-api/v1/auth/refresh-token`,
    - persists the rotated refresh token BEFORE setting the access
      token in memory,
    - sets the access token in the auth store.
   If the backend rejects the token (`400/401/403`) the auth session is
   cleared. Network/timeout failures keep the refresh token so the next
   launch / next 401 can recover.
4. **`AuthProvider` Phase 2** fetches `/cms-api/v1/auth/user-data` and
   stores the user in `useAuthStore`. This step never clears the
   tokens: the access token is freshly minted, so any 401 here will be
   handled by the apiClient interceptor on the next request.
5. **`AuthProvider`** flips `useAuthStore.bootstrapped = true`. The
   root `RootStackInner` waits for `serverHydrated && (!serverUrl ||
   bootstrapped)` before mounting the navigator, and CMS query hooks
   (`usePages`, `usePageContent`) only enable after that flag.
6. **`ServerStatusGate`** pings `/cms-api/v1/languages`. If it fails
   the user lands on an actionable error screen (Retry / Change
   server) instead of a blank or permanent loading screen.
7. **`SessionSyncProvider`** keeps `user-data` fresh, watches
   `acl_version` to invalidate `pages` / `page`, and runs the
   live-update channel (see "Live Updates" below).

## Single Refresh Path

The backend rotates the refresh token on every successful call:
`processRefreshToken()` removes the old `RefreshToken` row and creates
a new one. The same string can only be exchanged once. Two refresh
calls in flight with the same token deterministically lose the
session: the loser receives `401`, `clearAuthSession()` removes the
token from storage, and the user is logged out forever.

To prevent that, **every refresh — bootstrap or interceptor 401-retry
— goes through `services/tokenRefreshService.refreshAccessToken()`**:

- Module-level `inFlight` promise. Concurrent callers join the same
  promise, the rotated token is persisted before any of them returns.
- Persists the rotated refresh token BEFORE setting the access token
  in memory. A parallel reader can never see a new access token paired
  with a stale refresh token.
- Credential rejection (`400/401/403`) clears the auth session once.
- Network / 5xx returns `null` and leaves the token in place so the
  next attempt can recover.

The same idea protects the bootstrap itself: `AuthProvider` holds a
**module-scoped** `bootstrapPromise`. React StrictMode double-invoke,
parent re-mounts, and Fast Refresh in dev all join the same call.
Without this guard a second mount would burn the rotated refresh
token and the backend would reject it.

## Auth Persistence

- The **access token** is in memory only (`useAuthStore`). Never
  persisted.
- The **refresh token** is persisted via `secureStore`:
  - Native iOS/Android — `expo-secure-store`.
  - Expo Web preview — `localStorage` fallback. SecureStore is not a
    durable browser API, so we deliberately use the simplest
    same-origin store the browser can give us. Private/incognito
    windows that block storage degrade gracefully: the user has to log
    in again per session.

On reload or restart:
- `ServerProvider` restores the server URL synchronously from storage.
- `AuthProvider` exchanges the refresh token for a fresh access token.
- If refresh succeeds the session is restored before the router
  mounts.
- If refresh fails with `400/401/403` the auth state and refresh token
  are cleared and the next protected route redirects to login.
- Network/timeout failures keep the token so the next launch can try
  again.

## Token Refresh on 401

All API requests go through `services/apiClient.ts`:

- `X-Client-Type: mobile` is attached on every request.
- `Authorization: Bearer <accessToken>` is attached when an in-memory
  access token exists.
- A `401` response runs the request once more after
  `refreshAccessToken()`. The retried request carries `_retry = true`
  so an infinite loop is impossible.
- Several parallel 401s collapse into a single refresh because of the
  `inFlight` singleton.
- Credential rejection clears the auth session once.

## Login and Menu Refresh

`services/authService.commitAuthSuccess()` runs the same recipe for
login and 2FA verify:

1. Set `accessToken` + `user` in `useAuthStore`.
2. Persist the refresh token. Reloads must survive.
3. Remove every cached `user-data`, `pages`, `page` query so the cache
   doesn't briefly serve the previous identity (or anonymous data) on
   the next render.
4. Refetch `user-data` synchronously so the navigation tree has
   `acl_version` and language before the redirect.
5. Invalidate `pages` / `page` so any mounted screen refetches with
   the new permissions.

The `usePages` / `usePageContent` hooks include the auth scope
(`'auth' | 'anon'`) in their query keys, so the cache entry from
"before login" never serves "after login" — the keys are different.

## Direct Reloads and Deep Links

Direct reloads on `/menu`, `/page`, or `/<keyword>`:

1. `ServerProvider` restores the server URL.
2. `AuthProvider` refreshes and hydrates the user.
3. The Stack mounts.
4. Expo Router resolves the URL to its file route.
5. `usePageContent` / `usePages` fire because their `enabled` gate
   waits for the same `bootstrapped` flag.

If the requested route is protected and the user is anonymous, the
screen redirects to `/login?redirect=<original-path>`. After login the
gate routes back to the original URL.

If no server is selected (dev/preview) the gate redirects to
`/(dev)/server-picker?redirect=<original-path>`.

If the selected server is unreachable, `ServerStatusGate` shows an
error screen with Retry and (in dev/preview) Change-server actions.

## Live Updates (Mercure SSE)

The backend exposes the same Mercure bootstrap endpoint to mobile that
the web frontend already uses:

```
GET /cms-api/v1/auth/events
→ { hubUrl, topic, token, expiresIn }
```

The mobile app subscribes **directly** to the Mercure hub — no BFF —
via `react-native-sse`, which is an XHR-backed `EventSource`
implementation that supports custom headers. That matters because
Mercure authenticates subscribers with a JWT in
`Authorization: Bearer …`, and the standard browser `EventSource`
cannot set headers.

### Wire flow (`hooks/useAclEventStream.ts`)

1. After `bootstrapped` and an access token exist, call
   `GET /cms-api/v1/auth/events` (the standard apiClient handles auth,
   retries, and 401 refresh). Backend returns
   `{ hubUrl, topic, token, expiresIn }`.
2. Open an SSE connection to `${hubUrl}?topic=${topic}` with the
   `Authorization: Bearer ${token}` header.
3. On `acl-changed`, invalidate `['user-data', serverUrl]`. The refetch
   picks up the new `acl_version`, `useAclVersionWatcher` invalidates
   `['pages']` and `['page']`, and the rest of the menu/page content
   refreshes without any user interaction. Same wire contract as the
   web frontend's `useAclEventStream`.
4. On error, exponential backoff (1s → 2s → … → 30s capped). Reset on
   the next successful `open`.
5. ~30 seconds before the subscriber JWT expires, reconnect with a
   fresh token so an idle reconnect doesn't drop a real event.

### CORS and the Expo Web preview

Mercure's Caddy module enforces CORS for browser subscribers. For the
Expo Web preview to subscribe directly, the browser origin must be on
the hub's `cors_origins` allow-list and on Symfony API CORS for the
bootstrap/API requests. The backend
`docker-compose.mercure.yml` already includes:

```
cors_origins http://localhost:3000 http://127.0.0.1:3000 \
            http://localhost:8081 http://127.0.0.1:8081 \
            https://mobile-preview.example.com
```

If you run the Expo dev server on a non-default port, add that origin
too and restart the hub container. If you deploy Expo Web to a stable
preview host, add that exact host to both `CORS_ALLOW_ORIGIN` and
Mercure `cors_origins`. Native iOS/Android builds do not send an
`Origin` header so they are never blocked by CORS.

### Safety-net polling

`SessionSyncProvider.useUserDataPollingFallback()` invalidates
`user-data` every 5 minutes regardless of SSE state. This keeps the
session eventually consistent if the Mercure subscription happens to
drop (mobile network buffering, hub outage, transient CORS error in a
not-yet-allow-listed dev preview).

## Where Tokens, Server URL, and Other State are Stored

| Key                              | Native (iOS/Android) | Expo Web preview |
|----------------------------------|----------------------|------------------|
| `sh.refresh_token`               | `expo-secure-store` (Keychain on iOS, EncryptedSharedPreferences on Android) | `localStorage` |
| `sh.server_url` (dev picker)     | `expo-secure-store` | `localStorage` |
| `sh.language_locale`             | `expo-secure-store` | `localStorage` |
| `sh.device_token` (push)         | `expo-secure-store` | `localStorage` (unused on web) |
| `sh.dev_mode`                    | `expo-secure-store` | `localStorage` |
| Persisted React Query cache (`sh.rq`) | `@react-native-async-storage/async-storage` (encrypted only on iOS by default) | not persisted (in-memory only) |
| Access token (in-memory only)    | `useAuthStore` (Zustand)  — never persisted | same |
| Authenticated user object        | `useAuthStore` (Zustand) + `['user-data', serverUrl]` cache entry | same |
| Selected server URL (in-memory)  | `useServerStore` (Zustand), backed by `secureStore` for durability | same |

Implementation details:

- All persisted strings go through `services/secureStore.ts`. On
  native it forwards to `expo-secure-store`; on web it forwards to
  `globalThis.localStorage`. The same `SECURE_STORE_KEYS.*` keys work
  on both platforms.
- Native TanStack Query uses
  `@tanstack/query-async-storage-persister` with
  `@react-native-async-storage/async-storage` so cached page content
  survives a cold launch even before the network comes back. The
  persister is keyed by `QUERY_PERSIST_KEY = 'sh.rq'` and busted by
  `QUERY_CACHE_BUSTER` whenever the schema changes.
- Expo Web preview intentionally skips persisted query-cache restore and
  keeps the cache in-memory only. Auth/session still persist through
  `secureStore` (`localStorage` on web), but browser reload stability
  takes priority over restoring page caches there.
- The access token is **never** persisted by design — only the long-
  lived refresh token is, and the access token is re-minted on every
  cold start through `refreshAccessToken()`.
- Logout, server-switch, and credential rejection all call
  `clearAuthSession({ clearQueries: true, reason: '<who>' })`. That
  clears: in-memory auth store + persisted refresh token + persisted
  query cache + AsyncStorage entry for the React Query persister.

### Inspecting the storage at runtime

In dev/preview, the Floating Debug Panel exposes:

- **Auth tab**: `bootstrapped`, has-access-token, current user id.
- **Server tab**: selected URL + the dev-only web preview controls
  (`Device frame`, `Device`, `Orientation`, and `Preview content`).
- **Queries tab**: every cached key, including the persisted ones.
- **Logs tab**: the in-memory log buffer (`debugLogger`). Every API
  call also lands on the standard browser/native `console` so you can
  grep for `[sh:api]`, `[sh:tokenRefresh]`, `[sh:aclEvents]`,
  `[sh:session]`, `[sh:ServerProvider]`, and `[sh:AuthProvider]`.

On Expo Web you can open the browser DevTools Storage tab and look at
`localStorage` directly to confirm `sh.refresh_token` and
`sh.server_url` are present. On native, use the Expo dev menu's
"Inspect storage" or run `adb shell run-as <package> ls files/` (Android)
to inspect the SecureStore artefact.

## Files Involved

- `services/tokenRefreshService.ts` — single refresh singleton.
- `services/apiClient.ts` — axios instance with the 401 retry hook
  and per-request `[sh:api]` console logs.
- `services/authService.ts` — login / 2FA / logout helpers.
- `services/sessionService.ts` — `clearAuthSession`,
  `removeAuthScopedQueries`, `invalidateAuthScopedQueries`.
- `services/secureStore.ts` — cross-platform persistent KV.
- `services/debugLogger.ts` — in-memory log buffer + console mirror.
- `providers/ServerProvider.tsx` — server URL hydration.
- `providers/AuthProvider.tsx` — module-scoped bootstrap (Zustand
  selector hooks for parent-remount safety).
- `providers/SessionSyncProvider.tsx` — user-data observer, ACL
  watcher, Mercure subscription, polling fallback.
- `providers/QueryProvider.tsx` — persisted React Query (with a
  module-scope `persistOptions` reference; mutating that on every
  render would re-trigger the suspense fallback and remount the tree).
- `hooks/useAclEventStream.ts` — Mercure subscription hook.
- `app/_layout.tsx` — splash gate + `ServerStatusGate`.
- `docker-compose.mercure.yml` in the backend repo
  (`sh-selfhelp_backend/docker-compose.mercure.yml`) — Mercure hub
  CORS allow-list (Expo Web origin must be listed).
