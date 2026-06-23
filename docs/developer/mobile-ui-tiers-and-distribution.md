/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
# Mobile UI tiers (OSS vs Pro) and future distribution

Audience: Developers and technical operators.
Status: active (OSS tier shipping; Pro tier scaffolded; per-instance distribution = design).
Applies to: SelfHelp2 mobile app (`sh-selfhelp_mobile`) and the private `sh-selfhelp_mobile_pro_ui` repo.
Last verified: 2026-06-18.
Source of truth: `components/ui/adapters/` (contract + OSS tier), `components/ui/adapters/index.ts` (specifier), `tsconfig.json` `paths`, `metro.config.js` `extraNodeModules`, and the private `@selfhelp/mobile-pro-ui` package.

This app stays open-source. Paid HeroUI Pro components/tokens and the HeroUI Pro
license token must **never** live in this repo or any public repo. They live only
in the PRIVATE `sh-selfhelp_mobile_pro_ui` repo (npm package
`@selfhelp/mobile-pro-ui`).

## The adapter contract

The renderer never imports a UI library directly. It talks to the `Mobile*`
adapter contract in `components/ui/adapters/types.ts`
(`MobileButton`, `MobileText`, `MobileContainer`, `MobileCard`, `MobileInput`,
`MobileTextarea`, `MobileSwitch`, `MobileCheckbox`, `MobileSelect`,
`MobileModal`, aggregated by `IMobileUiAdapters`). Props are normalized and
renderer-agnostic (driven by the shared semantic mapper in `@selfhelp/shared`),
not raw library props, so every tier implements one shape.

## Two tiers, one contract

- **OSS (default).** In-repo adapters under `components/ui/adapters/oss/`, built
  on the open `heroui-native` components (e.g. `MobileInput`/`MobileTextarea`
  wrap HeroUI Native `TextField` + `Input`/`TextArea`). Where HeroUI Native has
  no equivalent, a React Native primitive fallback is used **with an inline
  comment** explaining why.
- **Pro.** The private `@selfhelp/mobile-pro-ui` package, built on paid HeroUI
  Pro components. It ships its own copy of the contract (`src/contract.ts`) which
  MUST stay byte-for-byte in sync with this repo's `types.ts`.

## Build-time tier selection (no app-code change)

Style components import from a single specifier:

```ts
import { MobileButton } from '@/components/ui/adapters';
```

`components/ui/adapters/index.ts` re-exports `@selfhelp/mobile-pro-ui`, which is
**aliased at build time**:

- OSS build (default): the specifier resolves to `components/ui/adapters/oss`.
- Pro build: it resolves to the private checkout when
  `SELFHELP_MOBILE_UI_TIER=pro` and `SELFHELP_MOBILE_PRO_UI_PATH=<path>` are set.

The alias is configured in `tsconfig.json` (`paths`) for type resolution and in
`metro.config.js` (`resolver.extraNodeModules`) for the bundler. `getMobileUiTier()`
in `types.ts` reads the env (`EXPO_PUBLIC_UI_TIER` / `SELFHELP_MOBILE_UI_TIER`),
defaulting to `oss`.

## Working on Pro adapters

1. Add the licensed HeroUI Pro dependency in PRIVATE CI using the HeroUI Pro
   token (never committed, never printed, never in docs).
2. Use the HeroUI MCP component docs to implement each adapter against the
   contract.
3. Keep `@selfhelp/mobile-pro-ui` `src/contract.ts` in sync with this repo's
   `components/ui/adapters/types.ts` (every `Mobile*` prop + `IMobileUiAdapters`).

## Future distribution (design, not built here)

React Native cannot safely load arbitrary JS at runtime, so the Pro tier and the
per-instance plugin set are **bundled per EAS profile** — each CMS instance
produces its own mobile binary. The intended pipeline, to be orchestrated by the
SelfHelp Manager:

1. A PRIVATE CI job builds the Pro-enabled app for a given instance/profile
   (Pro token injected only in CI), producing a versioned artifact/image.
2. The artifact is published to a private registry and referenced **by immutable
   image digest** (not a floating tag), so a deployment pins an exact build.
3. The Manager records, per instance, the pinned mobile build digest + the
   plugin lock set (`selfhelp.plugins.mobile.lock.json`) and surfaces version
   drift against the live backend `/cms-api/v1/plugins/manifest`.
4. `eas update --branch <profile>` ships JS-only updates to existing installs
   without store review; native/Pro-dependency changes require a new binary.

Nothing in the OSS repo depends on this pipeline; OSS builds always resolve the
in-repo open adapters and ignore the Pro path entirely.
