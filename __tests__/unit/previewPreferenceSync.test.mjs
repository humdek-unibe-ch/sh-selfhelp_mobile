/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Regression coverage for the Live Preview preference loop.
 *
 * The bridge may apply theme immediately, but it must discard locale. Language
 * is applied only by booting/remounting the iframe with its language URL and
 * scoped session; calling the normal language mutation here would rotate the
 * token, invalidate all page queries, and empty the menu during the loop.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
    applyPreviewThemePreferences,
    isPreviewLanguageControlLocked,
    previewThemePreferences,
    resolveInitialLocale,
} from '@/services/previewPreferenceSync';

test('preview URL language wins before page and menu queries start', () => {
    assert.equal(resolveInitialLocale('de', 'fr', 'en'), 'de');
    assert.equal(resolveInitialLocale(null, 'fr', 'en'), 'fr');
    assert.equal(resolveInitialLocale(null, null, 'en'), 'en');
});

test('only the embedded Live Preview locks the mobile language control', () => {
    assert.equal(isPreviewLanguageControlLocked(true, true), true);
    assert.equal(isPreviewLanguageControlLocked(true, false), false);
    assert.equal(isPreviewLanguageControlLocked(false, true), false);
});

test('preview bridge preferences never carry a locale', () => {
    assert.deepEqual(previewThemePreferences('dark'), {
        colorScheme: 'dark',
        locale: null,
    });
});

test('an inbound preference applies theme once and discards language', () => {
    const applied = [];

    const synced = applyPreviewThemePreferences(
        { colorScheme: 'light', locale: 'de' },
        'dark',
        (mode) => applied.push(mode),
    );

    assert.deepEqual(applied, ['light']);
    assert.deepEqual(synced, { colorScheme: 'light', locale: null });
});

test('an already-matching theme is a no-op', () => {
    const applied = [];

    const synced = applyPreviewThemePreferences(
        { colorScheme: 'auto', locale: 'fr' },
        'auto',
        (mode) => applied.push(mode),
    );

    assert.deepEqual(applied, []);
    assert.deepEqual(synced, { colorScheme: 'auto', locale: null });
});
