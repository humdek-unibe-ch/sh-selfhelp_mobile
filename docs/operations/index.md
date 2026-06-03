/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
# Mobile Operations Documentation

Audience: Operators, build maintainers, and deployers.
Status: active.
Applies to: SelfHelp2 Expo/React Native mobile app (`sh-selfhelp_mobile`).
Last verified: 2026-06-03.
Source of truth: `app.config.ts`, `eas.json`, `scripts/`, `config/`, and environment variables.

Setup, build, release, and runtime-config runbooks for the mobile app. See [../README.md](../README.md) for the full docs map.

- [setup.md](setup.md) - Install, prerequisites, and first run on web/iOS/Android.
- [server-selection.md](server-selection.md) - Multi-tenant strategy: dev picker vs baked URL, Expo Go and LAN setup.
- [builds.md](builds.md) - EAS Build profiles, signing, store submission, and OTA updates.
- [push-notifications.md](push-notifications.md) - APNs, FCM, and Expo push end-to-end.
- [deep-linking.md](deep-linking.md) - Custom scheme, universal links, app links, and tests.
