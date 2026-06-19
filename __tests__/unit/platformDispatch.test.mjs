/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Unit tests for the mobile dispatcher's platform contract.
 *
 * The mobile `BasicStyle` dispatcher skips styles that do not target mobile
 * using `isStyleSupportedOnPlatform` from the shared registry. The established
 * 90-style catalog currently targets `both` for every style (no style declares
 * a single-platform `platforms`), so these tests assert the contract the
 * dispatcher relies on: a core style renders on both platforms, unknown styles
 * default to both (so the page keeps rendering), and the CMS render-target
 * helpers round-trip the three target values.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
    isStyleSupportedOnPlatform,
    stylePlatformToSet,
    setToStylePlatform,
} from '@selfhelp/shared/registry';

test('a core "both" style targets web and mobile', () => {
    assert.equal(isStyleSupportedOnPlatform('button', 'mobile'), true);
    assert.equal(isStyleSupportedOnPlatform('button', 'web'), true);
});

test('unregistered styles default to both targets (page keeps rendering)', () => {
    assert.equal(isStyleSupportedOnPlatform('not-a-real-style', 'mobile'), true);
    assert.equal(isStyleSupportedOnPlatform('not-a-real-style', 'web'), true);
});

test('CMS render-target round-trips through the platform helpers', () => {
    assert.deepEqual(stylePlatformToSet('web'), ['web']);
    assert.deepEqual(stylePlatformToSet('mobile'), ['mobile']);
    assert.deepEqual([...stylePlatformToSet('both')].sort(), ['mobile', 'web']);

    assert.equal(setToStylePlatform(['web']), 'web');
    assert.equal(setToStylePlatform(['mobile']), 'mobile');
    assert.equal(setToStylePlatform(['web', 'mobile']), 'both');
});
