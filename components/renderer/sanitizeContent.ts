/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Global content sanitiser for CMS text that is rendered into React Native
 * `<Text>`. RN cannot render HTML, so any markup that leaks into a content
 * field (e.g. markdown processed to `<p class="…">…</p>`, or a stray `<br>`)
 * shows up as literal tag text. Every display-text field on mobile therefore
 * passes through {@link stripHtmlToText} at the single read chokepoint
 * (`useInterpolatedField`), so no renderer can forget to sanitise.
 *
 * IMPORTANT — JSON-aware: some CMS fields legitimately hold JSON strings
 * (config blobs, segmented-control data, table config). Those are read with
 * `readField`, not `useInterpolatedField`, but as a safety net this helper
 * leaves anything that parses as JSON untouched so structured payloads are
 * never mangled.
 *
 * Canonical home: this mirrors the web frontend's `stripHtmlTags`
 * (`src/utils/html-sanitizer.utils.ts`). The shared cross-platform helper is
 * `@selfhelp/shared` → `stripHtmlToText`; until that ships, web + mobile keep
 * their platform-local copies with identical behaviour.
 */

const HTML_ENTITIES: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&#x2F;': '/',
    '&#47;': '/',
};

function looksLikeJson(trimmed: string): boolean {
    const first = trimmed[0];
    if (first !== '{' && first !== '[') return false;
    try {
        JSON.parse(trimmed);
        return true;
    } catch {
        return false;
    }
}

/**
 * Strip HTML tags from a content string and decode the common entities,
 * returning readable plain text. Returns JSON strings and tag-free strings
 * untouched (apart from entity decoding) so it is safe to call on every field.
 */
export function stripHtmlToText(value: string): string {
    if (!value || typeof value !== 'string') return value ?? '';

    const trimmed = value.trim();
    // Never touch structured JSON payloads.
    if (looksLikeJson(trimmed)) return value;
    // Fast path: nothing that looks like markup or an entity.
    if (!/[<&]/.test(value)) return value;

    let out = value
        // Block-ish breaks become spaces so words don't run together.
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<\/(p|div|li|h[1-6]|tr|blockquote)>/gi, ' ')
        // Drop every remaining tag.
        .replace(/<[^>]+>/g, '');

    out = out.replace(/&[a-zA-Z#0-9]+;/g, (entity) => HTML_ENTITIES[entity.toLowerCase()] ?? entity);

    // Collapse the whitespace the tag removal introduced.
    return out.replace(/\s+/g, ' ').trim();
}
