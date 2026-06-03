/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
# Component pattern

Audience: Developers and technical operators.
Status: active.
Applies to: SelfHelp2 mobile app (sh-selfhelp_mobile).
Last verified: 2026-06-03.
Source of truth: Runtime code, configuration, and tests in this repository.

For non-trivial styles, use a 4-file split. For trivial leaves (≤ ~30 lines), a single file is fine.

## When to split

Split when **any** of these is true:
- The render body is over ~40 lines.
- More than two distinct className strings (header, body, footer).
- Local state or refs that justify a hook.
- Prop massaging logic the renderer shouldn't see.

## Layout

```
ContainerStyle/
├── ContainerStyle.tsx        # render only
├── ContainerStyle.styles.ts  # className constants + StyleSheet chunks
├── ContainerStyle.types.ts   # local prop types extending IContainerStyle
├── ContainerStyle.hooks.ts   # only when needed
└── index.ts                  # re-exports
```

### `ContainerStyle.tsx`

- Pure JSX. No `useState`, no `useEffect` here unless trivial (≤ 5 lines).
- Imports `cnRoot`, `cnHeader` from styles file rather than declaring inline.
- Uses helpers from `useField.ts` for reads instead of touching `section.fields` directly.

### `ContainerStyle.styles.ts`

- Named exports prefixed `cn`: `export const cnRoot = 'flex p-md rounded-md ...';`.
- For `StyleSheet.create` chunks, prefix with `s`: `export const sRoot = StyleSheet.create({...})`.
- Don't put logic here — these are constant strings/objects.

### `ContainerStyle.types.ts`

- `interface IContainerStyleProps extends IStyleProps {}` and any locally-derived shapes.
- Avoid duplicating the shared `IContainerStyle` interface — extend or compose it.

### `ContainerStyle.hooks.ts`

- One hook per concern: `useContainerLayout`, `useContainerToggle`, etc.
- Pure JS / RN, no JSX.

### `index.ts`

```ts
export { ContainerStyle } from './ContainerStyle';
```

## Single-file convention

Most current styles are single-file because the mobile body is ~20 lines and styling is delegated to `buildSectionClasses`. Keep that — splitting "just for consistency" hurts grep-ability.

## Naming

- File and component name match: `Button.tsx` exports `Button`.
- For style-name disambiguation (e.g. `text` clashes with RN's `Text`), suffix the export with `Style`: `TextStyle`, `ScrollAreaStyle`, `ListStyle`. The registry key stays the canonical CMS name.

## Children

Always render children with `<Children>` (from `components/renderer/Children.tsx`). It evaluates conditions and runs interpolation in one place. Don't iterate `section.children.map(...)` directly.

## Field access

Use the helpers in `components/renderer/useField.ts`:

| Helper | Use |
| ------ | --- |
| `readField<T>(section, name)`              | Plain read with optional generic. |
| `readBooleanField(section, name, default)` | Coerces SelfHelp's loose booleans (`'1'`, `1`, `true`). |
| `useInterpolatedField(section, name, vals)`| Reads + runs `{{...}}` interpolation. Use for any displayed text. |

Never read `section.fields[...]` directly — the helpers handle missing fields and translation-default fallbacks.
