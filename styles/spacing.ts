/**
 * Wrapper around the shared `parseSpacing` + `spacingToClasses` so style
 * components can convert the `mantine_spacing_margin_padding` JSON
 * blob into Uniwind classes in one call.
 */

import { parseSpacing, spacingToClasses, SPACING_TO_TAILWIND } from '@selfhelp/shared';

export function spacingClassNamesFromField(raw: string | null | undefined): string[] {
    return spacingToClasses(parseSpacing(raw), SPACING_TO_TAILWIND);
}
