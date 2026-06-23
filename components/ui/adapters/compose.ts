/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Compose the active mobile UI adapter set from the open-source base plus any
 * available Pro overrides, per capability.
 *
 * Mobile rendering plan, section 9.2:
 *   effective adapter = open-source adapter + available Pro overrides
 *
 * A Pro build that overrides only some capabilities keeps the open-source
 * implementation for every capability it does not improve. An override that is
 * `undefined` never erases its open-source fallback. Pure + side-effect free so
 * it is unit-testable without a build.
 */
import type { IMobileUiAdapters } from './types';

export function composeMobileAdapters(
    base: IMobileUiAdapters,
    overrides?: Partial<IMobileUiAdapters>,
): IMobileUiAdapters {
    if (!overrides) {
        return base;
    }
    // Drop `undefined` override entries so a partial Pro set never wipes a base
    // capability; only real overrides win.
    const defined = Object.fromEntries(
        Object.entries(overrides).filter(([, value]) => Boolean(value)),
    ) as Partial<IMobileUiAdapters>;
    return { ...base, ...defined };
}
