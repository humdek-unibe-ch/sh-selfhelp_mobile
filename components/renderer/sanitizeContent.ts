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
 * A single run of text with the inline formatting that applies to it. RN cannot
 * render HTML, so {@link parseInlineRich} turns the safe inline subset into these
 * runs and {@link InlineText} renders each as a nested `<Text>` with the matching
 * `fontWeight` / `fontStyle` / `textDecorationLine`. Mirrors the canonical
 * `@selfhelp/shared` `IInlineNode` (kept as a local copy like `stripHtmlToText`,
 * until consumers adopt the shared export).
 */
export interface IInlineNode {
    text: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    href?: string;
}

const SEPARATOR_TAGS = new Set([
    'br', 'p', 'div', 'li', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'tr', 'section', 'article', 'header', 'footer', 'pre',
]);

const INLINE_TAG_RE = /<(?:b|strong|i|em|u|a)\b/i;
const TAG_RE = /<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi;
const HREF_RE = /href\s*=\s*(?:"([^"]*)"|'([^']*)')/i;

function decodeEntities(value: string): string {
    if (!value.includes('&')) return value;
    return value.replace(/&[a-zA-Z#0-9]+;/g, (entity) => HTML_ENTITIES[entity.toLowerCase()] ?? entity);
}

function extractHref(attrs: string): string {
    const match = HREF_RE.exec(attrs);
    return (match?.[1] ?? match?.[2] ?? '').trim();
}

function formatKey(node: IInlineNode): string {
    return `${node.bold ? 1 : 0}|${node.italic ? 1 : 0}|${node.underline ? 1 : 0}|${node.href ?? ''}`;
}

/**
 * Does this value carry any of the supported inline tags? Lets a renderer
 * fast-path plain strings (and skip JSON). Mirrors the shared helper.
 */
export function hasInlineFormatting(value: string | null | undefined): boolean {
    if (value == null) return false;
    const str = String(value);
    if (!str.includes('<')) return false;
    if (looksLikeJson(str.trim())) return false;
    return INLINE_TAG_RE.test(str);
}

/**
 * Parse a CMS content string into a flat list of inline-formatted runs,
 * preserving only the safe inline subset (`<strong>`/`<b>`, `<em>`/`<i>`, `<u>`,
 * `<a>`). Block tags + `<br>` collapse to spaces; entities are decoded; a JSON
 * payload is returned as one untouched run. Mirrors the canonical
 * `@selfhelp/shared` `parseInlineRich`.
 */
export function parseInlineRich(value: string | null | undefined): IInlineNode[] {
    if (value == null) return [];
    const str = String(value);
    if (str === '') return [];

    const trimmed = str.trim();
    if (looksLikeJson(trimmed)) return [{ text: str }];

    if (!str.includes('<')) {
        const text = decodeEntities(str);
        return text === '' ? [] : [{ text }];
    }

    const raw: IInlineNode[] = [];
    let bold = 0;
    let italic = 0;
    let underline = 0;
    const hrefStack: string[] = [];

    const pushText = (segment: string): void => {
        if (segment === '') return;
        raw.push({
            text: segment,
            ...(bold > 0 ? { bold: true } : {}),
            ...(italic > 0 ? { italic: true } : {}),
            ...(underline > 0 ? { underline: true } : {}),
            ...(hrefStack.length > 0 ? { href: hrefStack[hrefStack.length - 1] } : {}),
        });
    };

    let lastIndex = 0;
    let match: RegExpExecArray | null;
    TAG_RE.lastIndex = 0;
    while ((match = TAG_RE.exec(str)) !== null) {
        pushText(str.slice(lastIndex, match.index));
        lastIndex = TAG_RE.lastIndex;

        const isClose = match[0].charAt(1) === '/';
        const tag = match[1].toLowerCase();
        const attrs = match[2] ?? '';

        if (tag === 'b' || tag === 'strong') {
            bold = isClose ? Math.max(0, bold - 1) : bold + 1;
        } else if (tag === 'i' || tag === 'em') {
            italic = isClose ? Math.max(0, italic - 1) : italic + 1;
        } else if (tag === 'u') {
            underline = isClose ? Math.max(0, underline - 1) : underline + 1;
        } else if (tag === 'a') {
            if (isClose) {
                hrefStack.pop();
            } else {
                hrefStack.push(extractHref(attrs));
            }
        } else if (SEPARATOR_TAGS.has(tag)) {
            pushText(' ');
        }
    }
    pushText(str.slice(lastIndex));

    const merged: IInlineNode[] = [];
    for (const node of raw) {
        const prev = merged[merged.length - 1];
        if (prev && formatKey(prev) === formatKey(node)) {
            prev.text += node.text;
        } else {
            merged.push({ ...node });
        }
    }
    for (const node of merged) {
        node.text = decodeEntities(node.text).replace(/\s+/g, ' ');
    }
    if (merged.length > 0) {
        merged[0].text = merged[0].text.replace(/^\s+/, '');
        merged[merged.length - 1].text = merged[merged.length - 1].text.replace(/\s+$/, '');
    }
    return merged.filter((node) => node.text !== '');
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
