/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Unit tests for `mobileStyleProps` / `readSharedStyleProps` / `mobileIntentPalette`.
 *
 * These prove the mobile adapter props are produced by the SHARED semantic
 * mapper (the single source of truth) reading the REAL cross-platform CMS
 * fields: `color` (Mantine palette), `variant` (Mantine variant),
 * `size`, `radius`, `full_width` — the same fields the web
 * renderer reads. The mobile renderer NEVER reads `web_*` (plan section 6.3),
 * and `shared_intent` is NOT in the live catalog. `mobileStyleProps` routes
 * through `toHeroUiSemanticProps`; the only mobile-local mapping is the
 * documented `mobile_variant` override.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
    mobileIntentPalette,
    mobileStyleProps,
    readSharedStyleProps,
} from '../../components/ui/mobileStyleProps.ts';
import { toHeroUiSemanticProps } from '@selfhelp/shared';

const sectionWithBag = (fields) => ({
    fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, { content: v }])),
});

test('readSharedStyleProps extracts the REAL shared_* appearance fields', () => {
    const props = readSharedStyleProps(
        sectionWithBag({
            color: 'red',
            variant: 'filled',
            size: 'lg',
            radius: 'sm',
            full_width: '1',
        }),
    );
    assert.equal(props.color, 'red');
    assert.equal(props.variant, 'filled');
    assert.equal(props.size, 'lg');
    assert.equal(props.radius, 'sm');
    assert.equal(props.fullWidth, true);
    assert.deepEqual(props.states, []);
});

test('readSharedStyleProps ignores out-of-domain values and never reads web_*', () => {
    const props = readSharedStyleProps(
        sectionWithBag({ size: 'xl', radius: 'xs', web_size: 'lg', web_radius: 'lg', web_justify: 'center' }),
    );
    // 'xl'/'xs' are outside the narrowed shared scales -> ignored, not clamped;
    // web_* is never read on mobile.
    assert.equal(props.size, undefined);
    assert.equal(props.radius, undefined);
});

test('readSharedStyleProps collects boolean states', () => {
    const props = readSharedStyleProps(sectionWithBag({ disabled: '1', loading: 'true', invalid: '0', required: '1' }));
    assert.deepEqual(props.states.slice().sort(), ['disabled', 'loading', 'required']);
});

test('mobileStyleProps routes through the shared HeroUI resolver (single source of truth)', () => {
    const section = sectionWithBag({ color: 'red', variant: 'filled', size: 'lg', full_width: '1' });
    const expected = toHeroUiSemanticProps(readSharedStyleProps(section));
    assert.deepEqual(mobileStyleProps(section), expected);
});

test('mobileStyleProps derives the HeroUI button variant + colour from color/variant', () => {
    // filled -> primary button variant; red -> danger semantic colour
    const filled = mobileStyleProps(sectionWithBag({ color: 'red', variant: 'filled' }));
    assert.equal(filled.buttonVariant, 'primary');
    assert.equal(filled.color, 'danger');
    // an explicit variant maps straight onto the HeroUI vocabulary
    const outline = mobileStyleProps(sectionWithBag({ variant: 'outline' }));
    assert.equal(outline.buttonVariant, 'outline');
    // colour-only (no variant) still drives the button variant: red -> danger
    const colorOnly = mobileStyleProps(sectionWithBag({ color: 'red' }));
    assert.equal(colorOnly.buttonVariant, 'danger');
});

test('mobile_variant overrides the resolved button variant', () => {
    const base = sectionWithBag({ color: 'red', variant: 'filled' });
    const withOverride = sectionWithBag({ color: 'red', variant: 'filled', mobile_variant: 'ghost' });
    assert.notEqual(mobileStyleProps(base).buttonVariant, 'ghost');
    assert.equal(mobileStyleProps(withOverride).buttonVariant, 'ghost');
});

test('an unknown mobile_variant is ignored (stays with the shared mapping)', () => {
    const section = sectionWithBag({ color: 'red', variant: 'filled', mobile_variant: 'not-a-variant' });
    assert.deepEqual(mobileStyleProps(section), toHeroUiSemanticProps(readSharedStyleProps(section)));
});

test('mobileIntentPalette resolves from color/variant (not web_*, not intent)', () => {
    const resolved = mobileIntentPalette(sectionWithBag({ color: 'red', variant: 'outline' }), 'light');
    assert.equal(resolved.colorName, 'red');
    assert.equal(resolved.variant, 'outline');
    // falls back to gray + the caller's default variant when nothing is authored
    const fallback = mobileIntentPalette(sectionWithBag({}), 'filled');
    assert.equal(fallback.colorName, 'gray');
    assert.equal(fallback.variant, 'filled');
});
