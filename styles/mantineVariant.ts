/**
 * Mantine `variant + color` → resolved colors for the mobile renderer.
 *
 * Mantine offers six interactive variants:
 *
 *   - filled       solid fill, white text
 *   - light        soft fill (color-0 / color-1), color-7 text
 *   - outline      transparent bg, color-6 border + text
 *   - default      white bg, gray border, gray-9 text  (the "neutral" one)
 *   - subtle       transparent bg, color-7 text, hover bg color-0
 *   - transparent  transparent bg, color-7 text, no hover surface
 *
 * Mantine extends a few of these for Alert/Card/Badge ("dot", "gradient")
 * — those collapse onto `filled` / `light` here so we keep the surface
 * tight and the look consistent across components.
 *
 * The resolved object is what every styled component then consumes —
 * one source of truth, no per-component variant ladders.
 */

import { COLOR_SCALES, COLOR_PALETTE, type TCanonicalColor } from '@selfhelp/shared';

export type TMantineVariant =
    | 'filled'
    | 'light'
    | 'outline'
    | 'default'
    | 'subtle'
    | 'transparent'
    | 'gradient'
    | 'dot';

export interface IResolvedVariant {
    background: string;
    foreground: string;
    border: string;
    borderWidth: number;
    pressedBackground: string;
    accent: string;
}

const TRANSPARENT = 'transparent';

function scale(color: string | undefined): readonly string[] {
    if (!color) return COLOR_SCALES.blue;
    return COLOR_SCALES[color as TCanonicalColor] ?? COLOR_SCALES.blue;
}

export function resolveMantineVariant(
    variant: string | undefined,
    color: string | undefined
): IResolvedVariant {
    const palette = scale(color);
    const accent = COLOR_PALETTE[color as TCanonicalColor] ?? palette[6] ?? '#228be6';
    const v = (variant ?? 'filled') as TMantineVariant;

    switch (v) {
        case 'light':
            return {
                background: palette[0],
                foreground: palette[8],
                border: TRANSPARENT,
                borderWidth: 0,
                pressedBackground: palette[1],
                accent,
            };
        case 'outline':
            return {
                background: TRANSPARENT,
                foreground: palette[7],
                border: palette[6],
                borderWidth: 1,
                pressedBackground: palette[0],
                accent,
            };
        case 'default':
            return {
                background: '#ffffff',
                foreground: '#212529',
                border: '#dee2e6',
                borderWidth: 1,
                pressedBackground: '#f1f3f5',
                accent,
            };
        case 'subtle':
            return {
                background: TRANSPARENT,
                foreground: palette[7],
                border: TRANSPARENT,
                borderWidth: 0,
                pressedBackground: palette[0],
                accent,
            };
        case 'transparent':
            return {
                background: TRANSPARENT,
                foreground: palette[7],
                border: TRANSPARENT,
                borderWidth: 0,
                pressedBackground: TRANSPARENT,
                accent,
            };
        case 'dot':
            return {
                background: TRANSPARENT,
                foreground: palette[7],
                border: '#dee2e6',
                borderWidth: 1,
                pressedBackground: '#f8f9fa',
                accent,
            };
        case 'filled':
        case 'gradient':
        default:
            return {
                background: accent,
                foreground: '#ffffff',
                border: TRANSPARENT,
                borderWidth: 0,
                pressedBackground: palette[7] ?? accent,
                accent,
            };
    }
}
