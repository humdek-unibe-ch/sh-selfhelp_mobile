# Mantine tokens on mobile

The CMS speaks "Mantine" — fields like `mantine_size`, `mantine_radius`, `mantine_color`, `mantine_variant`, and `mantine_spacing_margin_padding`. The mobile renderer maps these to Tailwind / Uniwind / HeroUI primitives so the visual language is identical on web and mobile.

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

`styles/spacing.ts` parses `mantine_spacing_margin_padding` (a JSON object) and emits the equivalent Tailwind classes:

```json
{ "mt": "md", "px": "lg", "pb": "xs" }
```

becomes

```
mt-md px-lg pb-xs
```

`styles/sectionClasses.ts` composes everything:

1. Auto-classes (`style-section-{id}`, `selfHelp-locale-{locale}`).
2. `cssMobileToUniwind(section.css_mobile)` — see [cms-classes.md](cms-classes.md).
3. Mantine-prop derived classes.
4. Mantine spacing JSON.

The result is a single string fed to `<View className=...>` — Uniwind picks it up at runtime.

## Variants

`mantine_variant` (e.g. `filled`, `outline`, `light`, `transparent`, `subtle`) maps to HeroUI variants on the components that support them (`Button`, `ActionIcon`, `Badge`, `Notification`, `Alert`). For surfaces that don't have a direct HeroUI variant, the mapper falls back to a Tailwind class set that approximates the look.

## Adding a new token

If editors start using a new Mantine size we don't recognise:

1. Add the entry to `tokens.ts` in the shared package.
2. Add a Tailwind alias in `sharedTailwindExtend` if needed.
3. Update the relevant mapper helper.
4. `npm run build` in the shared package, then restart Metro / web bundlers.
