/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
# Add a new SelfHelp instance

Audience: Developers extending the system.
Status: active.
Applies to: SelfHelp2 mobile app (sh-selfhelp_mobile).
Last verified: 2026-06-03.
Source of truth: Runtime code and the established patterns it follows.

Each customer gets their own production-grade build profile (`production-{slug}`), bundle id, package name, deep-link scheme, and store listing. This is how a single codebase ships as N apps.

## 1. Pick the instance slug

Slug rules: lowercase, kebab-case, no spaces, ≤ 12 chars (so it composes safely with `com.selfhelp.{slug}` and `selfhelp-{slug}://`). Example: `tpf`, `unibe`, `mp`.

## 2. Add the EAS build profile

Edit `eas.json`, add a `production-{slug}` block under `build`:

```json
"production-{slug}": {
    "extends": "production",
    "channel": "production-{slug}",
    "env": {
        "APP_INSTANCE_SLUG": "{slug}",
        "APP_NAME_OVERRIDE": "{Pretty Name}",
        "APP_BACKEND_URL": "https://api.{slug}.example.com",
        "APP_BUNDLE_ID": "com.selfhelp.{slug}",
        "APP_PACKAGE_NAME": "com.selfhelp.{slug}",
        "APP_SCHEME": "selfhelp-{slug}",
        "APP_UNIVERSAL_LINK_DOMAIN": "app.{slug}.example.com"
    }
}
```

And a matching submit block:

```json
"production-{slug}": {
    "android": {
        "serviceAccountKeyPath": "./secrets/play-{slug}.json",
        "track": "internal",
        "releaseStatus": "draft"
    },
    "ios": {
        "appleId": "...",
        "ascAppId": "...",
        "appleTeamId": "..."
    }
}
```

## 3. Apple side (iOS)

- App Store Connect → My Apps → +.
- Bundle ID: `com.selfhelp.{slug}` (matches `APP_BUNDLE_ID`).
- Capabilities: Push Notifications, Associated Domains.
- Apple Developer → Identifiers → ensure your team owns the matching App ID.
- For push: APNs Auth Key (`.p8`) once per Apple team is enough across instances.
- For universal links: serve the AASA file at `https://app.{slug}.example.com/.well-known/apple-app-site-association` listing `TEAMID.com.selfhelp.{slug}`.

## 4. Google side (Android)

- Google Play Console → Create app.
- Package name: `com.selfhelp.{slug}`.
- Settings → Service Account → create or reuse, save the JSON to `./secrets/play-{slug}.json` (gitignored).
- For push: enable Firebase Cloud Messaging on the matching package and upload the V1 service account to EAS via `eas credentials -p android`.
- For app links: serve `https://app.{slug}.example.com/.well-known/assetlinks.json` with the SHA-256 from `eas credentials -p android`.

## 5. Build

```bash
EAS_BUILD_PROFILE=production-{slug} npm run build:prod:android -- --profile production-{slug}
EAS_BUILD_PROFILE=production-{slug} npm run build:prod:ios     -- --profile production-{slug}
```

## 6. Submit

```bash
npm run submit:android -- --profile production-{slug}
npm run submit:ios     -- --profile production-{slug}
```

## 7. Submission checklist (per instance)

### Pre-build

- [ ] Backend URL reachable from public internet (TLS valid, no self-signed certs).
- [ ] CMS has a `home` page accessible to anonymous + authenticated users.
- [ ] CMS auth pages (`login`, `register`, `validate`, `resetPassword`, `twoFactorAuth`, `profile`) exist with the correct keywords.
- [ ] Splash + icon assets in `assets/` are 1:1 quality (1024×1024 for icon, splash for all sizes).

### iOS

- [ ] App Store Connect record created with the production bundle ID.
- [ ] Privacy details filled (camera, microphone, photo library, location if used).
- [ ] APNs key uploaded to EAS.
- [ ] AASA file served from the universal-link domain.
- [ ] Screenshots: 6.7", 5.5", iPad 12.9" — all required sizes.
- [ ] Reviewer notes mention test credentials and the expected entry flow.

### Android

- [ ] Play Console app created with the production package name.
- [ ] Data Safety form filled honestly.
- [ ] Service account JSON saved + path correct in `eas.json`.
- [ ] FCM credentials uploaded.
- [ ] App Links: `assetlinks.json` served + `pm verify-app-links` passes.
- [ ] Internal track tested by ≥ 1 person before promoting to production.
- [ ] Content rating questionnaire submitted.

### Both

- [ ] Push notification end-to-end test on a real device.
- [ ] Deep-link end-to-end test (custom scheme + universal/app link).
- [ ] Login + logout + refresh test.
- [ ] OTA update tested by publishing to the matching channel and confirming the binary picks it up.
- [ ] Run `npm run typecheck && npm run lint` clean.

## 8. Hand-off

Once the first build is in the store:

- Move the service account JSON out of the dev's machine into the team's secret manager.
- Add the slug to your monitoring dashboards.
- Document the instance-specific quirks (custom CMS pages, third-party integrations) under `docs/instances/{slug}.md`.
