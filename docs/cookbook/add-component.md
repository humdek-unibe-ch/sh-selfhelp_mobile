/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
# Add a non-style component

Audience: Developers extending the system.
Status: active.
Applies to: SelfHelp2 mobile app (sh-selfhelp_mobile).
Last verified: 2026-06-03.
Source of truth: Runtime code and the established patterns it follows.

Use this when you need a UI piece that isn't tied to a CMS style — e.g. a debug overlay, a custom navigation header, a bespoke screen.

## Where it lives

| Component type | Folder |
| -------------- | ------ |
| Shared primitive (Avatar, Spinner)            | `components/shared/` |
| App-shell piece (header, drawer, footer)      | `components/shell/` |
| Feedback (loading, error, empty)              | `components/feedback/` |
| Renderer infrastructure                       | `components/renderer/` |
| Anything else                                 | `components/<topic>/` |

Don't put non-style components under `components/styles/` — that path is reserved for CMS style impls.

## Pattern

For non-trivial components follow the [4-file split](../developer/styling/component-pattern.md). For small leaves, single file is fine.

## Wire it up

- If it's used by a route, import it directly from the screen file.
- If multiple screens consume it, put a re-export in `index.ts` of the parent folder so callers import from the folder name.

## Example: a footer

```
components/shell/AppFooter/
├── AppFooter.tsx
├── AppFooter.styles.ts
└── index.ts
```

```ts
// index.ts
export { AppFooter } from './AppFooter';
```

```ts
// app/(app)/_layout.tsx
import { AppFooter } from '@/components/shell/AppFooter';
```

## Tests / smoke

- Hit `npm run typecheck` and `npm run lint`.
- For new screens, navigate to the route in the web preview at least once before opening a PR.
