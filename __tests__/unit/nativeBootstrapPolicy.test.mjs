/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Regression coverage for the installed `/mobile-preview` web build. Browser
 * URL state is owned by Expo Router on web; the native initial-link bootstrap
 * must stay dormant there so it cannot push `/mobile-preview` as a CMS keyword.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldRunNativeStartupSideEffects } from '../../providers/nativeBootstrapPolicy.ts';

test('web preview does not install native startup side effects', () => {
    assert.equal(shouldRunNativeStartupSideEffects('web'), false);
});

test('native platforms keep initial-link and OTA startup side effects', () => {
    assert.equal(shouldRunNativeStartupSideEffects('ios'), true);
    assert.equal(shouldRunNativeStartupSideEffects('android'), true);
});
