# Builds

Cloud builds use **EAS Build**. Profiles live in `eas.json`.

## Profiles

| Profile | Purpose | Distribution |
| ------- | ------- | ------------ |
| `development`        | Dev client with the full Expo dev menu. | internal |
| `preview`            | Signed dev build with picker on. | internal (TestFlight / Play internal) |
| `production-{slug}`  | Per-instance signed build with backend URL baked. | store |

Trigger via the wrappers in `package.json`:

```bash
npm run build:dev:android       # development profile
npm run build:preview:ios       # preview profile
npm run build:prod:android -- --profile production-tpf  # specific instance
```

For each new SelfHelp instance, copy the `production` template inside `eas.json`, set the env vars (slug, URL, bundle id, package name, scheme, optional universal-link domain), and build.

## Submission

```bash
npm run submit:android -- --profile production-tpf
npm run submit:ios     -- --profile production-tpf
```

Both expect `eas.json -> submit` blocks per instance. Set:
- iOS: `appleId`, `ascAppId`, `appleTeamId`.
- Android: `serviceAccountKeyPath` (Google Play Console JSON key).

## Signing

- iOS credentials are managed automatically by EAS (recommended) — first run will provision a distribution cert + provisioning profile per bundle id.
- Android: EAS generates the keystore on first build and stores it. Keep a backup.

## Versioning

- `version` (semver) is in `app.config.ts` — bump for store releases.
- `runtimeVersion: { policy: 'appVersion' }` so OTA updates only target binaries with the matching marketing version.

## OTA (EAS Update)

```bash
APP_BACKEND_URL=... eas update --branch production
```

Or via wrappers:

```bash
npm run update:prod
```

Set `APP_EAS_UPDATE_URL` in the build profile's env vars to enable OTA on built binaries (`updates.url` in `app.config.ts`). The app silently checks for updates on cold start and after foregrounding (see `native/updates.ts`).

## Store checklists

### iOS — first release

- [ ] Apple Developer Program enrolled.
- [ ] App Store Connect record created with the production `bundleIdentifier`.
- [ ] APNs key uploaded (push) — see [push-notifications.md](push-notifications.md).
- [ ] Privacy manifest entries: NSCameraUsageDescription, NSMicrophoneUsageDescription, NSPhotoLibraryUsageDescription, NSPhotoLibraryAddUsageDescription (already in `app.config.ts`).
- [ ] App Privacy details filled in App Store Connect.
- [ ] Universal link AASA file served from `APP_UNIVERSAL_LINK_DOMAIN` (see [deep-linking.md](deep-linking.md)).
- [ ] Screenshots for all required device sizes.

### Android — first release

- [ ] Google Play Console app created with the production `package`.
- [ ] FCM Server key uploaded to EAS (`eas credentials`).
- [ ] Permissions match `app.config.ts > android.permissions`.
- [ ] App Links: `assetlinks.json` served at `https://{domain}/.well-known/assetlinks.json`.
- [ ] Data-safety form filled.
- [ ] Internal track tested before production rollout.
