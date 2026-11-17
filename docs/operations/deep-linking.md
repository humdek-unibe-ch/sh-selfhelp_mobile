/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
# Deep linking

Audience: Operators and deployers.
Status: active.
Applies to: SelfHelp2 mobile app (sh-selfhelp_mobile).
Last verified: 2026-11-13.
Source of truth: Runtime configuration, environment variables, scripts, and deployment services.

The app handles three classes of link, all routed through `native/deepLinks.ts`:

| Form | Example | Use |
| ---- | ------- | --- |
| Custom scheme       | `selfhelp://home`                          | Internal links, push payloads. |
| Custom scheme + auth | `selfhelp://validate/42/abc...`            | Email validation / password reset deep-link from emails. |
| Universal / app link | `https://app.selfhelp.com/messages`        | Tappable URLs that open the app if installed, fall back to web otherwise. |

`deepLinks.ts` classifies each URL with `classifyDeepLink()` and routes through Expo Router. Auth-flow keywords use the live kebab-case CMS keywords (`validate`, `reset-password`). Validate / reset-password links carry the `user_id` and `token` segments through to the corresponding screens as **snake_case** Expo Router params (`user_id`, `token`) — matching the backend `page_routes` parameter names (issue #30). The canonical reset email link is `/reset/{user_id}/{token}`; the `/reset-password/{user_id}/{token}` alias is accepted too.

**Routing identity:** Expo screens still mount on the `[keyword]` catch-all route, but internal shell navigation and deep links resolve targets through page URLs (`pageUrlToMobileRoute`) and, for parameterized paths, `pageService.resolvePageByPath()` so nested public URLs do not rely on keyword guessing.

### DB-driven path resolution (parameterized links)

The single-keyword parser above covers the auth flows. For richer parameterized
public URLs — e.g. an entry-record deep link `/team/{record_id}` — the app
resolves the **full path** against the backend `page_routes` contract with
`pageService.resolvePageByPath('/team/7')` (which calls
`GET /cms-api/v1/pages/resolve?path=...`). The resolved page carries snake_case
`route_params` (`{ record_id: '7' }`) plus `matched_url_pattern` and
`canonical_url`, so the renderer shows the right record without hardcoding slug
parsing. Open-access applies only to the resolve API route; the resolved page
still enforces full page ACL, so an unauthorized deep link renders nothing
sensitive.

### Links that carry the state of an entry list

The query of a link is part of where it leads. A page that keeps its state in
the link, an entry list (`entry-form-list`) or a data view (`data-view`), opens
in that state, cold or warm, whether it is a route screen (the page is on the
menu) or a sheet over home (it is not):

```text
selfhelp://qa-events?events.page=2
selfhelp://qa-entries?entries.q=invoice&entries.sort=entry_date:desc
```

`<key>` is the `list_key` of the list. The parameters are the ones of the web
URL: `<key>.page`, `<key>.q` (search), `<key>.sort`, `<key>.f.<control id>`
(one filter), `<key>.record` and `<key>.mode` (open a record to view, edit or
add). A list reads only the parameters of its own key, so two lists on one page
keep their own state. An unknown or malformed parameter is answered by the list
with an error state and a way back to the whole list, never by a blank screen.

While the screen is open, a new link to it replaces the state of the list. Typing
in the search box or turning a page does not add a navigation entry, so the
Android Back button leaves the page, not the previous search.

To try a link on an emulator: `adb shell am start -a android.intent.action.VIEW -d "selfhelp://qa-events?events.page=2"`
(in Expo Go the link is `exp://<host>:<port>/--/qa-events?events.page=2`).

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
