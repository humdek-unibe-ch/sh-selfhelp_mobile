/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
# Using the SelfHelp Mobile App

Audience: Non-technical end users and operators.
Status: active.
Applies to: SelfHelp2 Expo/React Native mobile app (`sh-selfhelp_mobile`).
Last verified: 2026-06-03.
Source of truth: Observable behavior of the current build (`app/`, `providers/`, push and deep-linking services).

A non-technical orientation to the SelfHelp mobile app. For installation, builds, and configuration, see the [operations runbooks](../operations/index.md).

## What the app is

The SelfHelp mobile app shows SelfHelp content (pages, forms, and media) to end users on iOS and Android. Each customer (instance) gets its own branded build with its own name, icon, and backend.

## Choosing a server

- In production app-store builds, the app already points at the correct backend, so there is nothing to choose - it opens straight to the content.
- In development and preview builds, a server picker appears on first launch so testers can select a backend or paste a custom URL.

## Signing in

The app uses the same accounts as the SelfHelp web platform. After signing in, your session is remembered, so reopening the app keeps you logged in until you sign out or the session expires.

## Everyday use

- Browse the pages and sections published for your instance.
- Fill in and submit forms; submissions go to the same backend as the website.
- Switch language where multiple languages are available.
- Open links that lead directly to a specific page in the app (deep links), for example from an email or notification.

## Notifications

If your instance enables push notifications, the app can ask permission to send them and then deliver alerts (for example reminders or new content). You can manage notification permission from your device settings.

## Getting help

If something looks wrong (for example the app cannot reach the server, or content does not load), contact your SelfHelp administrator. Operators can use the [operations runbooks](../operations/index.md) to check setup, server selection, builds, push notifications, and deep linking.
