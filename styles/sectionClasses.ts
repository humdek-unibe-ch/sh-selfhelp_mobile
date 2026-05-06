/**
 * Common class-string composer used by every container/leaf style.
 * Combines:
 *   - `css_mobile` (after allow-list filtering)
 *   - parsed `mantine_spacing_margin_padding` or legacy `mantine_spacing_margin`
 *   - any extra classes the style itself wants
 *
 * Section #id is also baked in as `style-section-{id}` (mirrors the web
 * frontend) so testing/styling hooks work consistently.
 */

import { cssMobileToUniwind } from './cssMobileToUniwind';
import { spacingClassNamesFromField } from './spacing';
import { readField } from '@/components/renderer/useField';
import type { TSectionLike } from '@/components/renderer/types';

export interface ISectionClassOptions {
    extra?: ReadonlyArray<string | undefined | null | false>;
}

export function buildSectionClasses(section: TSectionLike, options: ISectionClassOptions = {}): string {
    const cssMobile = (section as { css_mobile?: string | null }).css_mobile ?? null;
    const cssClasses = cssMobileToUniwind(cssMobile);

    const spacing =
        readField<string>(section, 'mantine_spacing_margin_padding') ??
        readField<string>(section, 'mantine_spacing_margin');
    const spacingClasses = spacingClassNamesFromField(spacing).join(' ');

    const idTag = `style-section-${section.id}`;

    return [idTag, cssClasses, spacingClasses, ...(options.extra ?? [])]
        .filter(Boolean)
        .join(' ')
        .trim();
}
