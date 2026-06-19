/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
# Mantine tokens on mobile

Audience: Developers and technical operators.
Status: active.
Applies to: SelfHelp2 mobile app (sh-selfhelp_mobile).
Last verified: 2026-06-18.
Source of truth: Runtime code, configuration, and tests in this repository; `@selfhelp/shared/src/theme/semantic.ts` for the cross-platform mapping.

One CMS style name renders a Mantine component on web and a HeroUI Native component on mobile. The two platforms share one set of renderer-agnostic semantic fields; each platform resolves them to its own UI-library props through the shared mapper. This keeps the visual language identical without either renderer re-deriving colors/sizes locally.

## Field model (three buckets)

Every style's fields fall into three buckets:

- **Shared (unprefixed) semantic fields** — mean the same thing on both platforms and are resolved per-platform by the shared mapper: `size`, `spacing`, `radius`, `intent`, state booleans (`disabled` / `loading` / `invalid` / `required`), `full_width`. One `intent: primary` becomes Mantine `{ color: 'blue', variant: 'filled' }` on web and a HeroUI `primary` button variant / `accent` color on mobile.
- **`web_*` fields** — configure the Mantine renderer only (Mantine-specific `variant`, gradient, etc.).
- **`mobile_*` fields** — configure the HeroUI Native renderer only (e.g. `mobile_variant` for a HeroUI-specific look).

The shared mapper in `@selfhelp/shared/src/theme/semantic.ts` is the single source of truth: `resolveSharedStyleForWeb()` (Mantine props) and `resolveSharedStyleForMobile()` (HeroUI Native props), plus the lower-level `mapSizeToHeroUi` / `mapRadiusToPx` / `mapSpacingToPx` / `mapIntentTo*` helpers. HeroUI Native supports a narrower scale than Mantine (only `sm | md | lg` sizes; no success/warning button variant), so the mapper **clamps to the nearest safe value** and documents each clamp inline.

On mobile, `components/ui/mobileStyleProps.ts` reads the shared fields off a section and feeds them to the mapper. Resolution order per concept is `mobile_*` override → shared semantic field → legacy `web_*` field. The legacy `web_*` fallback is temporary: it stays until the backend reseeds these cross-platform fields as unprefixed shared fields, then it is removed together with the web renderers' switch to `resolveSharedStyleForWeb`.

## Legacy mapping (Mantine tokens)

The CMS historically used `web_*`-prefixed fields (`web_size`, `web_radius`, `web_variant`). These still resolve through the token tables below for any style not yet migrated to the shared field names. Two semantic fields have already migrated: **colour** `web_color` → `shared_color` (slice 2 / RF-13), and **spacing** `web_spacing_margin` → `shared_spacing` (slice 9 / RF-15 — the box-model field the mobile renderer now reads first). Both still resolve through the same token tables.

## Token tables

The single source of truth is `sh-selfhelp_shared/src/theme/tokens.ts`:

- `FONT_SIZE_PX` — Mantine sizes → pixel values (also surfaced as `text-{size}` Tailwind classes).
- `SPACING_PX` — `xs / sm / md / lg / xl` → pixel values (also `p-{size}`, `m-{size}`, `gap-{size}`).
- `RADIUS_PX` — `xs / sm / md / lg / xl / full` → pixel values (also `rounded-{size}`).
- `COLOR_SCALES` — Mantine palette per name (10 shades each).

`sharedTailwindExtend` exposes the same scales as a Tailwind preset, so both Tailwind (web) and Uniwind (mobile) read identical token names.

## Mapper helpers

`styles/mantineToTailwind.ts`:

- `mantineSizeToTextClass(size)` → `text-xs | text-sm | ...`
- `mantineSpacingToPaddingClass(size, axis?)` → `p-md`, `px-lg`, etc.
- `mantineRadiusToClass(radius)` → `rounded-md`
- `mantineColorToClass(color, role)` → `bg-blue-600` / `text-blue-600` / `border-blue-600`

`styles/spacing.ts` parses `shared_spacing` (a box-model JSON object) and emits the equivalent Tailwind classes:

```json
{ "mt": "md", "px": "lg", "pb": "xs" }
```

becomes

```
mt-md px-lg pb-xs
```

`styles/sectionClasses.ts` composes everything:

1. Auto-classes (`style-section-{id}`, `selfHelp-locale-{locale}`).
2. `cssMobileToUniwind(section.css_mobile)` — see [cms-classes.md](./cms-classes.md).
3. Mantine-prop derived classes.
4. Mantine spacing JSON.

The result is a single string fed to `<View className=...>` — Uniwind picks it up at runtime.

## Variants

`web_variant` (e.g. `filled`, `outline`, `light`, `transparent`, `subtle`) maps to HeroUI variants on the components that support them (`Button`, `ActionIcon`, `Badge`, `Notification`, `Alert`). For surfaces that don't have a direct HeroUI variant, the mapper falls back to a Tailwind class set that approximates the look.

## Adding a new token

If editors start using a new Mantine size we don't recognise:

1. Add the entry to `tokens.ts` in the shared package.
2. Add a Tailwind alias in `sharedTailwindExtend` if needed.
3. Update the relevant mapper helper.
4. `npm run build` in the shared package, then restart Metro / web bundlers.
