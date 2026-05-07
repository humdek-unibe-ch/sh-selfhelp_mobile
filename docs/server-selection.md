# Server selection

Mobile builds are either **multi-tenant** (dev / preview) or **single-tenant** (production).

## Dev / preview builds

- `APP_INSTANCE_SLUG=dev` and no `APP_BACKEND_URL` baked.
- On first launch, the `(dev)/server-picker.tsx` route lets the user pick from:
  - the legacy SelfHelp server catalog loaded from `APP_SERVER_SELECTION_URL`,
  - local fallback presets in `config/dev-servers.ts`,
  - a custom manually entered Symfony backend URL.
- The selected URL is persisted in `expo-secure-store` (`SECURE_STORE_KEYS.SERVER_URL`).
- Switching server clears the React Query cache and triggers a logout — you can never see one tenant's data through another's auth state.
- On reload, the selected server is restored before auth refresh and before page/menu queries are enabled.
- If the selected server cannot answer `GET /cms-api/v1/languages`, the app shows an error screen with retry and change-server actions instead of leaving the route blank.
- Expo Web preview uses the exact same backend base URL as native, but loopback hosts are normalized to `localhost` so browser Mercure cookie auth stays on one host. For browser preview to receive live permission updates, the preview host must be allowed in Symfony API CORS and the Mercure hub should be exposed on that same host.

The default `APP_SERVER_SELECTION_URL` mirrors the old Capacitor app:
`https://tpf-test.humdek.unibe.ch/SelfHelpMobile/mobile_projects`.

To add a local fallback preset for the team, edit `config/dev-servers.ts` and rebuild the dev client.

## Which URL should I enter?

Enter the **Symfony backend base URL**, not a Next.js frontend page URL.

For example, if the web frontend page is:

```text
http://127.0.0.1:3000/t1
```

do not enter `http://127.0.0.1:3000`. Instead, enter the backend API host that serves `/cms-api/v1`, for example:

```text
http://localhost:8000
```

Then open `/t1` in the mobile preview/app. The mobile route uses `t1` as the CMS keyword and fetches:

```text
{backend}/cms-api/v1/pages/by-keyword/t1
```

## Production builds

Each customer (instance) gets a build profile in `eas.json`, e.g. `production-tpf` or `production-mp`. Each profile sets:

```json
{
    "production-tpf": {
        "env": {
            "APP_INSTANCE_SLUG": "tpf",
            "APP_BACKEND_URL": "https://api.tpf.example.com",
            "APP_BUNDLE_ID": "com.selfhelp.tpf",
            "APP_PACKAGE_NAME": "com.selfhelp.tpf",
            "APP_SCHEME": "selfhelp-tpf"
        }
    }
}
```

`app.config.ts` reads these env vars and:
- bakes the URL into `Constants.expoConfig.extra.bakedBackendUrl`.
- makes the dev picker route a no-op (it never mounts).
- gives each instance its own bundle id, package name, and deep-link scheme so a single device can host both `selfhelp-tpf://` and `selfhelp-mp://`.

## Expo Web preview hosting

For a browser-based CMS preview flow, prefer one stable host such as:

```text
https://mobile-preview.example.com
```

That host should:

- point the app at the Symfony backend base URL, not the Next.js web frontend URL
- be included in backend `CORS_ALLOW_ORIGIN` so normal API requests succeed
- expose Mercure on that same host (for example `https://mobile-preview.example.com/.well-known/mercure`) so browser cookie auth can work cleanly
- be included in Mercure `cors_origins` so direct browser SSE succeeds

Native iOS/Android builds do not need the Mercure CORS allow-list because they do not send a browser `Origin` header.

## Switching server in dev

From any screen, tap the `Server` button in the header or navigate to `/server-picker`. It's hidden in production builds.

## What gets reset on server switch

- React Query cache (`queryClient.clear()`)
- Auth (refresh token cleared from SecureStore, access token cleared from memory)

Local app preferences stay intact, but page/form/user data is refetched from the newly selected server.

See [auth-bootstrap.md](auth-bootstrap.md) for the full restore, token refresh, direct reload, and live-update flow.
