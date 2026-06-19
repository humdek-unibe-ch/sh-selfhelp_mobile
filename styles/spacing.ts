/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Wrapper around the shared `parseSpacing` + `spacingToClasses` so style
 * components can convert the `shared_spacing` box-model JSON
 * blob into Uniwind classes in one call.
 */

import { parseSpacing, spacingToClasses, SPACING_TO_TAILWIND } from '@selfhelp/shared';

export function spacingClassNamesFromField(raw: string | null | undefined): string[] {
    return spacingToClasses(parseSpacing(raw), SPACING_TO_TAILWIND);
}
