/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
<!--
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
-->
# SelfHelp Mobile Documentation

Audience: Mobile developers, technical operators, build maintainers, and AI coding agents.
Status: active.
Applies to: SelfHelp2 Expo/React Native mobile app (`sh-selfhelp_mobile`).
Last verified: 2026-06-03.
Source of truth: Mobile source code, `AGENTS.md`, shared package contracts, and backend API schemas.

Navigation entrypoint for the mobile documentation, organized by audience and purpose per the Documentation Rules in `AGENTS.md`. The root [../README.md](../README.md) is the short overview and quick start.

## Documentation map

| Folder | Use for |
| --- | --- |
| [developer/](developer/index.md) | Architecture, auth bootstrap, daily workflow, plugins, styling, and engineering best practices. |
| [operations/](operations/index.md) | Setup, server selection, EAS builds/releases, push notifications, and deep-linking runbooks. |
| [cookbook/](cookbook/index.md) | Step-by-step recipes for adding styles, components, APIs, instances, and shared-type updates. |
| [user/](user/index.md) | Non-technical orientation to the app for end users and operators. |

## Developer

| Doc | Purpose |
| --- | --- |
| [developer/architecture.md](developer/architecture.md) | High-level diagrams, request flow, and layers. |
| [developer/auth-bootstrap.md](developer/auth-bootstrap.md) | Server restore, auth persistence, refresh, direct reloads, and live updates. |
| [developer/development.md](developer/development.md) | Day-to-day workflow, scripts, debug tools, and conventions. |
| [developer/best-practices.md](developer/best-practices.md) | Do/don't list and performance/accessibility notes. |
| [developer/plugins.md](developer/plugins.md) | How the mobile app consumes SelfHelp plugins. |
| [developer/mobile-preview.md](developer/mobile-preview.md) | The `selfhelp-mobile-preview` web image: build mode, embed contract, boot flow, in-container proxy, curated plugin bundling, and live-reload dev. |
| [developer/styling/cms-classes.md](developer/styling/cms-classes.md) | The `css_mobile` allow-list and remap pipeline. |
| [developer/styling/mantine-tokens.md](developer/styling/mantine-tokens.md) | Mapping Mantine semantic props to HeroUI/Uniwind. |
| [developer/styling/component-pattern.md](developer/styling/component-pattern.md) | The four-file split and when single-file is fine. |

## Operations

| Doc | Purpose |
| --- | --- |
| [operations/setup.md](operations/setup.md) | Install, prerequisites, and first run on web/iOS/Android. |
| [operations/server-selection.md](operations/server-selection.md) | Multi-tenant strategy: dev picker vs baked URL, Expo Go and LAN setup. |
| [operations/builds.md](operations/builds.md) | EAS Build profiles, signing, store submission, and OTA updates. |
| [operations/push-notifications.md](operations/push-notifications.md) | APNs, FCM, and Expo push end-to-end. |
| [operations/deep-linking.md](operations/deep-linking.md) | Custom scheme, universal links, app links, and tests. |

## Cookbook

| Doc | Purpose |
| --- | --- |
| [cookbook/add-style.md](cookbook/add-style.md) | Add a CMS style end-to-end for web and mobile. |
| [cookbook/add-component.md](cookbook/add-component.md) | Add a non-style component. |
| [cookbook/add-api.md](cookbook/add-api.md) | Add a `/cms-api/v1/*` endpoint. |
| [cookbook/update-shared-types.md](cookbook/update-shared-types.md) | Bump shared types in lockstep with web. |
| [cookbook/add-instance.md](cookbook/add-instance.md) | Add a new SelfHelp customer instance. |

## Conventions

- Every active doc starts with the metadata block (`Audience`, `Status`, `Applies to`, `Last verified`, `Source of truth`).
- Filenames use lowercase kebab-case; this file (`README.md`) is the only uppercase docs entrypoint, and subfolder indexes are `index.md`.
- Source code, configuration, and tests are the source of truth. When a doc conflicts with the code, the code wins and the doc is corrected.
