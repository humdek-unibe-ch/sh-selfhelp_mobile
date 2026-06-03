/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
# CMS Tailwind classes (`css_mobile`)

Audience: Developers and technical operators.
Status: active.
Applies to: SelfHelp2 mobile app (sh-selfhelp_mobile).
Last verified: 2026-06-03.
Source of truth: Runtime code, configuration, and tests in this repository.

The mobile renderer only reads the `css_mobile` field, never `css`. Editors are encouraged to author web styles in `css` and mobile-specific overrides in `css_mobile`.

The pipeline (`styles/cssMobileToUniwind.ts` and `styles/sectionClasses.ts`) is:

1. Tokenise the string on whitespace.
2. For each token, call `classifyClassString` (from `@selfhelp/shared/cms-classes`).
3. Append safe + remapped tokens; drop unsupported ones.
4. In `__DEV__`, log dropped tokens once per token-string.

## Allow-list

Lives in `sh-selfhelp_shared/src/cms-classes/allow-list.ts`. It mirrors the Tailwind v4 base + the SelfHelp design tokens that work identically on web and mobile:

- spacing: `p-{0..16}`, `m-{0..16}`, `gap-{0..16}`, `space-{x,y}-{0..16}`
- typography: `text-{xs,sm,base,lg,xl,2xl,...}`, `font-{light,normal,semibold,bold,black}`, `text-{left,center,right,justify}`
- color: `text-{gray|blue|red|...}-{50..900}`, `bg-{...}-{...}`, `border-{...}-{...}`
- layout: `flex`, `flex-{row,col,wrap,...}`, `items-{start,center,...}`, `justify-{start,center,...}`, `grid-cols-{1..12}`
- borders + radius: `border`, `border-{0..8}`, `rounded`, `rounded-{sm,md,lg,xl,full}`
- effects: `shadow-{sm,md,lg,xl,2xl}`, `opacity-{0..100}`

## Remap

`sh-selfhelp_shared/src/cms-classes/remap.ts` translates web-only tokens to their mobile equivalents (or marks them for drop):

| Web token | Mobile result |
| --------- | ------------- |
| `hover:*`, `focus:*`, `group-*`     | dropped (no hover state on touch) |
| `sm:`, `md:`, `lg:` prefixes        | dropped — mobile doesn't have CSS media queries; use platform conditions instead |
| `cursor-*`                          | dropped |
| `select-{none,text}`                | dropped |
| `transition-*`                      | mapped to a baseline opacity transition where applicable |

## Dev warnings

When `__DEV__` is true, dropped or remapped tokens are logged with the originating section id so editors can spot them and fix them in the CMS:

```
[cssMobileToUniwind] section 1234: dropped tokens: hover:bg-blue-500, sm:flex
```

Add a console filter for `cssMobileToUniwind` if the noise is too high.

## Adding a new safe class

1. Edit `sh-selfhelp_shared/src/cms-classes/allow-list.ts` and add the literal token (or a regex if it's a family).
2. `npm run build` in the shared package.
3. Restart Metro.

Same procedure for the web frontend — both consumers share the same allow-list, so coverage stays in lockstep.

## Custom CSS strings

`css_mobile` should NOT contain raw CSS strings (e.g. `padding: 12px`). The renderer ignores anything that isn't a Tailwind token. If you need a value the allow-list doesn't cover, extend the allow-list rather than dropping CSS into the field.
