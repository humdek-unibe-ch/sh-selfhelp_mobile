/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Translates a `css_mobile` field value into the className string fed to
 * Uniwind/HeroUI. Routes every class through the shared
 * `classifyClassString` so:
 *
 *   - allow-listed classes pass through unchanged,
 *   - remapped classes are rewritten,
 *   - unsupported classes are dropped (with a console warning in dev).
 */

import { classifyClassString } from '@selfhelp/shared';

export function cssMobileToUniwind(raw: string | null | undefined): string {
    if (!raw) return '';
    const classes = classifyClassString(raw, (decision) => {
        if (!__DEV__) return;
        if (decision.kind === 'drop') {
            // eslint-disable-next-line no-console
            console.warn(`[css_mobile] drop "${decision.className}" — ${decision.reason ?? 'not allowed'}`);
        } else if (decision.kind === 'remap') {
            // eslint-disable-next-line no-console
            console.info(`[css_mobile] remap "${decision.from}" -> "${decision.to}" (${decision.reason ?? ''})`);
        }
    });
    return classes.join(' ');
}
