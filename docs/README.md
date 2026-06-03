/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
# SelfHelp Mobile Documentation

Audience: mobile developers, technical operators, build maintainers, and AI coding agents.
Status: active documentation index.
Applies to: SelfHelp2 Expo/React Native mobile docs in this repository.
Last verified: 2026-06-03.
Source of truth: mobile source code, `AGENTS.md`, shared package contracts, and backend API schemas.

Use this page as the navigation entrypoint for mobile documentation. New or substantially rewritten docs should follow the audience-based placement rules in `AGENTS.md`.

## Current Documentation Map

| Doc | Purpose | Future placement rule |
| --- | --- | --- |
| [setup.md](setup.md) | Install, prerequisites, first run on web/iOS/Android. | Move to `docs/operations/` when reorganizing setup/runbooks. |
| [development.md](development.md) | Day-to-day workflow, scripts, conventions. | Keep as developer workflow documentation. |
| [server-selection.md](server-selection.md) | Multi-tenant strategy: dev picker vs baked URL. | Move to `docs/operations/` when reorganizing environment docs. |
| [builds.md](builds.md) | EAS Build profiles, signing, store submission, OTA. | Move to `docs/operations/` when reorganizing release docs. |
| [push-notifications.md](push-notifications.md) | APNs, FCM, and Expo push end-to-end. | Keep as operations/developer hybrid until split is useful. |
| [deep-linking.md](deep-linking.md) | Custom scheme, universal links, app links, and tests. | Keep as operations/developer hybrid until split is useful. |
| [architecture.md](architecture.md) | High-level diagrams, request flow, layers. | Keep as developer architecture documentation. |
| [styling/cms-classes.md](styling/cms-classes.md) | The `css_mobile` allow-list and remap pipeline. | Keep as developer styling reference. |
| [styling/mantine-tokens.md](styling/mantine-tokens.md) | Mapping Mantine semantic props to HeroUI/Uniwind. | Keep as developer styling reference. |
| [styling/component-pattern.md](styling/component-pattern.md) | Four-file split and when single-file is fine. | Keep as developer styling reference. |
| [cookbook/add-style.md](cookbook/add-style.md) | Add a CMS style end-to-end for web and mobile. | Keep as cookbook documentation. |
| [cookbook/add-component.md](cookbook/add-component.md) | Add a non-style component. | Keep as cookbook documentation. |
| [cookbook/add-api.md](cookbook/add-api.md) | Add a `/cms-api/v1/*` endpoint. | Keep as cookbook documentation. |
| [cookbook/update-shared-types.md](cookbook/update-shared-types.md) | Bump shared types in lockstep with web. | Keep as cookbook documentation. |
| [cookbook/add-instance.md](cookbook/add-instance.md) | Add a new SelfHelp customer instance. | Keep as cookbook documentation. |
| [best-practices.md](best-practices.md) | Do/don't list and performance/accessibility notes. | Keep as developer guidance. |

## New Documentation Placement

| Folder | Use for |
| --- | --- |
| `docs/developer/` | Architecture, renderer behavior, shared-contract usage, testing, performance, and engineering workflow. |
| `docs/user/` | Non-technical app behavior, end-user feature walkthroughs, and operator-facing feature notes. |
| `docs/reference/` | API contracts, EAS profile fields, renderer catalogs, style support tables, and config keys. |
| `docs/cookbook/` | Step-by-step recipes for adding styles, APIs, instances, tests, or shared-contract updates. |
| `docs/operations/` | Setup, server selection, build/release, push notification, deep-linking, and store runbooks. |
| `docs/archive/` | Historical implementation summaries and superseded design notes. |

If something is missing, add it here rather than in scattered comments.
