/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
# Update shared types

Audience: Developers extending the system.
Status: active.
Applies to: SelfHelp2 mobile app (sh-selfhelp_mobile).
Last verified: 2026-06-03.
Source of truth: Runtime code and the established patterns it follows.

The `sh-selfhelp_shared` package is consumed by both the web frontend and the mobile app via `file:` deps. Bumping types means updating both sides in lockstep.

## When to touch shared

- New CMS style.
- New / changed field on an existing style.
- New `/cms-api/v1/*` endpoint.
- New top-level types (`IUserData`, page DTOs).
- New or updated Mantine token.

## Procedure

1. **Edit** the relevant file under `sh-selfhelp_shared/src/`.
2. **Build** the package:
   ```bash
   cd sh-selfhelp_shared && npm run build
   ```
3. **Refresh consumers** — in both `sh-selfhelp_frontend` and `sh-selfhelp_mobile`:
   ```bash
   rm -rf node_modules/.cache  # web only
   npm install --force         # re-link the file:dep
   ```
   On the mobile side restart Metro with `npm run start:clean`.
4. **Fix breakage** — TypeScript errors are intentional. Each consumer must implement the new field / register the new style / bind the new endpoint.
5. **Type-check both** — `npm run typecheck` in mobile, `npm run typecheck` in web.

## Versioning

Today the file: dep means "whatever's on disk". When you switch to a private npm registry:

1. Bump `version` in `sh-selfhelp_shared/package.json` following semver.
2. Publish (`npm publish --registry ...`).
3. Update `@selfhelp/shared` in `package.json` of both consumers.

Until then, treat HEAD of `sh-selfhelp_shared` as the contract.

## Avoiding drift

Two safety nets the shared package gives you:

- **Style registry** — `STYLE_REGISTRY` is a const map keyed by `TStyleName`. Both consumers must provide an impl for every key (the impl map is `Partial<Record<TStyleName, ...>>`, but `UnknownStyle` flags missing keys at runtime in dev mode). When you add a new style to the registry, both apps light up red until they implement it.
- **Endpoint constants** — using `ENDPOINTS.X.Y` instead of literal strings. If a path moves, both apps break compilation immediately.
