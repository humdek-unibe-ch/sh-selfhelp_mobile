/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Pure markup helpers for the mobile {@link RichTextEditor} toolbar. Kept free of
 * any React Native import so the wrapping logic can be unit-tested under
 * `node --test` (which strips TypeScript but cannot resolve RN modules).
 *
 * The editor only offers the inline subset every mobile renderer understands
 * (`<strong>`, `<em>`, `<u>`, `<a>`) — the same subset `parseInlineRich` parses
 * and `InlineText` renders — so what the author formats is exactly what shows on
 * the page, and the emitted HTML round-trips with the web TipTap editor's output.
 */

export interface ITextEdit {
    /** The full field value after the edit. */
    text: string;
    /** Selection start to restore (selects the wrapped inner text). */
    selectionStart: number;
    /** Selection end to restore. */
    selectionEnd: number;
}

/** The inline formats the mobile editor can apply (and the renderers can show). */
export type TInlineFormat = 'bold' | 'italic' | 'underline' | 'link';

const TAGS: Record<TInlineFormat, { open: string; close: string }> = {
    bold: { open: '<strong>', close: '</strong>' },
    italic: { open: '<em>', close: '</em>' },
    underline: { open: '<u>', close: '</u>' },
    // Default href is a visible, editable placeholder; the author tweaks the URL
    // in the (themed) source field. Mirrors how the web editor seeds a new link.
    link: { open: '<a href="https://">', close: '</a>' },
};

function clamp(n: number, min: number, max: number): number {
    if (Number.isNaN(n)) return min;
    return Math.max(min, Math.min(n, max));
}

/**
 * Wrap the current selection (or insert an empty pair at the caret) with the
 * given inline format's tags and report where the inner text now sits so the
 * caller can restore a sensible selection.
 */
export function applyInlineFormat(
    value: string,
    start: number,
    end: number,
    format: TInlineFormat,
): ITextEdit {
    const safeValue = value ?? '';
    const s = clamp(start, 0, safeValue.length);
    const e = clamp(end, s, safeValue.length);

    const { open, close } = TAGS[format];
    const selected = safeValue.slice(s, e);
    const before = safeValue.slice(0, s);
    const after = safeValue.slice(e);

    const text = `${before}${open}${selected}${close}${after}`;
    const innerStart = before.length + open.length;
    const innerEnd = innerStart + selected.length;

    return { text, selectionStart: innerStart, selectionEnd: innerEnd };
}
