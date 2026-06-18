/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Convert Mantine semantic field values (size, color, radius, spacing,
 * justify, align, …) into the Uniwind class equivalents declared in
 * `@selfhelp/shared`'s shared Tailwind preset.
 *
 * The preset extends `theme.extend.colors`, `spacing`, `borderRadius`,
 * `fontSize` from the shared token tables, so e.g. `text-blue-6` and
 * `p-md` resolve identically on web and mobile.
 */

import { SPACING_TO_TAILWIND } from '@selfhelp/shared';
import type { TCanonicalSpacing } from '@selfhelp/shared';

export function sizeToTextClass(size: string | undefined): string | undefined {
    if (!size) return undefined;
    return `text-${size}`;
}

export function radiusToClass(radius: string | undefined): string | undefined {
    if (!radius) return undefined;
    return `rounded-${radius}`;
}

export function spacingToPaddingClass(value: string | undefined, axis?: 'x' | 'y'): string | undefined {
    if (!value) return undefined;
    const tail = SPACING_TO_TAILWIND[value as TCanonicalSpacing] ?? value;
    return axis ? `p${axis}-${tail}` : `p-${tail}`;
}

export function spacingToMarginClass(value: string | undefined, axis?: 'x' | 'y'): string | undefined {
    if (!value) return undefined;
    const tail = SPACING_TO_TAILWIND[value as TCanonicalSpacing] ?? value;
    return axis ? `m${axis}-${tail}` : `m-${tail}`;
}

export function colorTextClass(color: string | undefined, shade = 6): string | undefined {
    if (!color) return undefined;
    if (color.startsWith('#') || color.startsWith('rgb') || color.startsWith('hsl')) {
        // arbitrary value
        return `text-[${color}]`;
    }
    return `text-${color}-${shade}`;
}

export function colorBgClass(color: string | undefined, shade = 6): string | undefined {
    if (!color) return undefined;
    if (color.startsWith('#') || color.startsWith('rgb') || color.startsWith('hsl')) {
        return `bg-[${color}]`;
    }
    return `bg-${color}-${shade}`;
}

export function gapToClass(gap: string | undefined): string | undefined {
    if (!gap) return undefined;
    const tail = SPACING_TO_TAILWIND[gap as TCanonicalSpacing] ?? gap;
    return `gap-${tail}`;
}

export const JUSTIFY_TO_CLASS: Record<string, string> = {
    'flex-start': 'justify-start',
    'flex-end': 'justify-end',
    center: 'justify-center',
    'space-between': 'justify-between',
    'space-around': 'justify-around',
    'space-evenly': 'justify-evenly',
};

export const ALIGN_TO_CLASS: Record<string, string> = {
    'flex-start': 'items-start',
    'flex-end': 'items-end',
    center: 'items-center',
    stretch: 'items-stretch',
    baseline: 'items-baseline',
};

export const DIRECTION_TO_CLASS: Record<string, string> = {
    row: 'flex-row',
    column: 'flex-col',
    'row-reverse': 'flex-row-reverse',
    'column-reverse': 'flex-col-reverse',
};

export function joinClasses(...parts: (string | undefined | null | false)[]): string {
    return parts.filter(Boolean).join(' ');
}
