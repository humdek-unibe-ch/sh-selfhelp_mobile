/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
# Deep linking

The app handles three classes of link, all routed through `native/deepLinks.ts`:

| Form | Example | Use |
| ---- | ------- | --- |
| Custom scheme       | `selfhelp://home`                          | Internal links, push payloads. |
| Custom scheme + auth | `selfhelp://validate/42/abc...`            | Email validation / password reset deep-link from emails. |
| Universal / app link | `https://app.selfhelp.com/messages`        | Tappable URLs that open the app if installed, fall back to web otherwise. |

`deepLinks.ts` parses each URL into a `{ keyword, userId?, token? }` triple and routes via Expo Router. Validate / reset-password links carry the `user_id` and `token` segments through to the corresponding screens.

## Configuring the custom scheme

Set `APP_SCHEME` in the build profile env vars. Per-instance schemes (e.g. `selfhelp-tpf`) prevent collisions when multiple SelfHelp tenants are installed on the same device.

`app.config.ts` writes the scheme to both iOS and Android.

## iOS — universal links (AASA)

1. Set `APP_UNIVERSAL_LINK_DOMAIN=app.selfhelp.com` in the build profile.
2. `app.config.ts` adds `applinks:app.selfhelp.com` to the iOS associated domains.
3. Serve the AASA file at `https://app.selfhelp.com/.well-known/apple-app-site-association` (no extension, JSON content-type, no redirects):

```json
{
    "applinks": {
        "details": [
            {
                "appIDs": ["TEAMID.com.selfhelp.tpf"],
                "components": [
                    { "/": "/*" }
                ]
            }
        ]
    }
}
```

Test with `xcrun simctl openurl booted https://app.selfhelp.com/messages` after installing a build that includes the matching associated domain.

## Android — App Links (Digital Asset Links)

1. Same env var: `APP_UNIVERSAL_LINK_DOMAIN`.
2. `app.config.ts` registers the intent filter with `autoVerify: true` for `https://{domain}/*`.
3. Serve `https://{domain}/.well-known/assetlinks.json`:

```json
[
    {
        "relation": ["delegate_permission/common.handle_all_urls"],
        "target": {
            "namespace": "android_app",
            "package_name": "com.selfhelp.tpf",
            "sha256_cert_fingerprints": ["AA:BB:CC:..."]
        }
    }
]
```

Get the SHA-256 from `eas credentials -p android` after the first build.

Verify with `adb shell pm verify-app-links --re-verify com.selfhelp.tpf`.

## Testing without a server

```bash
# custom scheme
npx uri-scheme open "selfhelp://validate/42/abc" --android
npx uri-scheme open "selfhelp://validate/42/abc" --ios

# universal link
xcrun simctl openurl booted "https://app.selfhelp.com/messages"
adb shell am start -W -a android.intent.action.VIEW -d "https://app.selfhelp.com/messages"
```

## Adding a new auth-style deep link

If you introduce a new style that needs deep-linkable params (e.g. magic-link login), extend the segment parser in `parseLink()` (in `native/deepLinks.ts`). Keep the keyword aligned with the CMS page keyword so routing is consistent.
