/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Convenience hooks for style components to read fields out of a section
 * without constantly typing `section.fields?.foo?.content as string`.
 *
 * `useField` reads a string field with optional interpolation against
 * the page-level `values` map.
 */

import { useMemo } from 'react';
import { replaceCalcedValues } from '@selfhelp/shared';
import type { IContentField } from '@selfhelp/shared';
import { stripHtmlToText, parseInlineRich, type IInlineNode } from './sanitizeContent';

/**
 * Loose section shape: any object that *might* carry a `fields` map plus
 * top-level field-shaped properties. We never assume an index signature
 * because the shared `IPageSectionWithFields` interface is a strict shape.
 */
type TFieldHolder = { fields?: Record<string, unknown> } & object;

export function readField<T = unknown>(section: TFieldHolder, name: string): T | undefined {
    const top = (section as Record<string, unknown>)[name];
    if (top && typeof top === 'object' && 'content' in (top)) {
        return (top as IContentField<T>).content;
    }
    const fromBag = section.fields?.[name];
    if (fromBag && typeof fromBag === 'object' && 'content' in fromBag) {
        return (fromBag as IContentField<T>).content;
    }
    return undefined;
}

export function readStringField(section: TFieldHolder, name: string, fallback = ''): string {
    const v = readField<string>(section, name);
    if (v === undefined || v === null) return fallback;
    return String(v);
}

export function useInterpolatedField(
    section: TFieldHolder,
    name: string,
    values: Record<string, unknown>,
    fallback = ''
): string {
    const raw = readStringField(section, name, fallback);
    // Sanitise at the single display-text chokepoint: interpolate first (a value
    // could itself carry markup), then strip HTML to plain text. JSON-aware, so
    // structured payloads read via this path are left intact.
    return useMemo(
        () => stripHtmlToText(replaceCalcedValues(raw, values as Record<string, string | number | boolean | null | undefined>)),
        [raw, values]
    );
}

/**
 * Like {@link useInterpolatedField} but for prose slots that should keep the
 * author's inline formatting: interpolate first, then parse the safe inline
 * subset into {@link IInlineNode} runs (instead of stripping to plain text), so a
 * Ctrl+B bold / italic / underline / link authored on the web renders on mobile
 * via `<InlineText>`. JSON-aware: a structured payload is returned as one
 * untouched run.
 */
export function useInlineFormattedField(
    section: TFieldHolder,
    name: string,
    values: Record<string, unknown>,
    fallback = ''
): IInlineNode[] {
    const raw = readStringField(section, name, fallback);
    return useMemo(
        () => parseInlineRich(replaceCalcedValues(raw, values as Record<string, string | number | boolean | null | undefined>)),
        [raw, values]
    );
}

export function readBooleanField(section: TFieldHolder, name: string, fallback = false): boolean {
    const v = readField<unknown>(section, name);
    if (v === undefined || v === null || v === '') return fallback;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    if (typeof v === 'string') return v === '1' || v.toLowerCase() === 'true';
    return Boolean(v);
}

export function readNumberField(section: TFieldHolder, name: string, fallback?: number): number | undefined {
    const v = readField<unknown>(section, name);
    if (v === undefined || v === null || v === '') return fallback;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
}
