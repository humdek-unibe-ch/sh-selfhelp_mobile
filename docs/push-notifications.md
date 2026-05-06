# Push notifications

End-to-end setup for Expo Notifications + APNs (iOS) + FCM (Android).

## App side

`native/notifications.ts` handles the runtime:
1. On Android, creates the `default` notification channel.
2. Asks for permission (only when the user is logged in — see `NativeBootstrap`).
3. Calls `Notifications.getExpoPushTokenAsync({ projectId })` and returns the token.
4. The token is reported to the backend via `services/devicesService.ts` → `POST /cms-api/v1/auth/devices`.

Foreground listener and tap-response listener are wired in `NativeBootstrap.tsx`. To act on a tap (e.g. deep-link to a page), pass payload data in your push (`{ "data": { "keyword": "..." } }`) and route from `addNotificationResponseListener`.

## iOS — APNs

1. Apple Developer → Certificates, Identifiers & Profiles → Keys → +.
2. Enable Apple Push Notifications service (APNs).
3. Download the `.p8` key, note the Key ID and Team ID.
4. EAS: `eas credentials -p ios`. Choose your project, then "Push Notifications: APNs Key" → upload the `.p8`.
5. Confirm capability "Push Notifications" is on for the bundle id (EAS toggles this automatically).
6. Test from any logged-in device using `npx expo-cli push:android` or the Expo Push Tool.

## Android — FCM

1. Firebase Console → create or pick the project.
2. Add an Android app with the same `package` as `APP_PACKAGE_NAME` (per instance).
3. Download `google-services.json` (only needed if you also use FCM directly; not required for Expo's default JSON delivery).
4. Project settings → Cloud Messaging → copy the **Server Key** (Cloud Messaging API legacy) or set up the V1 service account.
5. EAS: `eas credentials -p android`. Choose "Push Notifications: Google Service Account Key" and upload the JSON.

## Sending pushes from the backend

The Symfony backend stores Expo push tokens per device. To send, POST to `https://exp.host/--/api/v2/push/send`:

```json
{
    "to": "ExponentPushToken[xxx]",
    "title": "New message",
    "body": "Open SelfHelp to read it.",
    "data": { "keyword": "messages" }
}
```

For batches use the same endpoint with an array body. The Expo push service queues per device and returns receipts you can poll for delivery feedback.

## Troubleshooting

- **No token returned in dev** — make sure you're on a real device (Expo doesn't issue tokens in simulators).
- **`no_project_id` reason** — set `APP_EAS_PROJECT_ID` in the build profile's env vars.
- **Push works in foreground but not background** (iOS) — confirm "Background Modes → Remote notifications" is on for the bundle id.
- **Android: "Notification channel must exist"** — `setNotificationChannelAsync('default', ...)` runs once; if you change the channel name, bump it in `native/notifications.ts` and reinstall the app.
