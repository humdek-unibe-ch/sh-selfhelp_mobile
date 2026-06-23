/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
# Add a new CMS style

Audience: Developers extending the system.
Status: active.
Applies to: SelfHelp2 mobile app (sh-selfhelp_mobile).
Last verified: 2026-06-03.
Source of truth: Runtime code and the established patterns it follows.

End-to-end recipe for introducing a new style (web + mobile).

One CMS style name renders a Mantine component on web and a HeroUI Native component on mobile. Classify each field into one of three buckets before you start:

- **Portable (unprefixed) semantic fields** (`size`, `spacing`, `radius`, `color`, `variant`, state booleans, `full_width`) — resolved per-platform by `@selfhelp/shared/src/theme/semantic.ts`. Read them on mobile through `components/ui/mobileStyleProps.ts` (never re-derive color/size locally).
- **`web_*` fields** — Mantine-only extras.
- **`mobile_*` fields** — HeroUI Native-only extras.

See [mantine-tokens.md](../developer/styling/mantine-tokens.md#field-model-three-buckets) for the full model.

## 1. Define the schema in shared

`sh-selfhelp_shared/src/types/styles/<group>.ts` — add the per-style interface:

```ts
export interface IFancyButtonStyle extends IBaseStyle {
    style_name: 'fancy-button';
    fields: {
        label: IContentField<string>;
        href: IContentField<string>;
        variant?: IContentField<TMantineVariant>;
    };
}
```

Append it to the union in `unknown.ts`:

```ts
export type TStyle = ... | IFancyButtonStyle;
```

## 2. Register it

`sh-selfhelp_shared/src/registry/styles.registry.ts`:

```ts
'fancy-button': { description: 'Fancy button', category: 'interactive', canHaveChildren: false },
```

Cross-platform styles omit `platforms` (defaulting to both web and mobile); set `platforms` only for a genuinely platform-exclusive style. `TStyleName` updates automatically.

## 3. Build the shared package

```bash
cd sh-selfhelp_shared && npm run build
```

## 4. Implement the mobile component

`sh-selfhelp_mobile/components/styles/interactive/FancyButton.tsx`:

```tsx
import { Pressable, Text } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { useInterpolatedField } from '@/components/renderer/useField';

export function FancyButton({ section, values }: IStyleProps): React.ReactElement {
    const label = useInterpolatedField(section, 'label', values);
    return (
        <Pressable className={buildSectionClasses(section)}>
            <Text>{label}</Text>
        </Pressable>
    );
}
```

For styling driven by the shared semantic fields, resolve them through the mapper instead of reading `web_*` directly:

```tsx
import { mobileStyleProps, mobileIntentPalette } from '@/components/ui/mobileStyleProps';

const resolved = mobileStyleProps(section); // { size, buttonVariant, color, radiusPx, ... }
const { palette } = mobileIntentPalette(section); // clean-RN fallback palette from `color`/`variant`
```

If a free `heroui-native` component exists for the style, render that. If it is a Pro-tier component HeroUI Native does not ship, render a clean React Native fallback (OSS tier) — the polished version lives in `@selfhelp/mobile-pro-ui` (see [mobile-ui-tiers-and-distribution.md](../developer/mobile-ui-tiers-and-distribution.md)).

For non-trivial bodies, follow the [4-file pattern](../developer/styling/component-pattern.md).

## 5. Register the impl

`sh-selfhelp_mobile/components/styles/index.ts`:

```ts
import { FancyButton } from './interactive/FancyButton';
// ...
export const styleImpls: TStyleImplMap = {
    // ...
    'fancy-button': FancyButton,
};
```

TypeScript will tell you if the registry and the impl map disagree.

## 6. Implement the web component

The web frontend is the same procedure on the Mantine side. Both apps must provide an impl — the shared registry enforces it.

## 7. Add backend SQL

If the style isn't in the backend yet, add it via the SelfHelp migration helpers (`get_style_id`, `get_field_id`, `get_field_type_id`) so the CMS exposes it to editors.

## 8. Smoke test

```bash
cd sh-selfhelp_mobile && npm run typecheck && npm run lint
npm run web   # render a page that uses the new style
```

## 9. Document

If the style has non-obvious editor-facing behaviour, add a short note under `docs/styling/` or in the CMS field's `help` text.
