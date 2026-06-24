/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Regression coverage for the embedded preview navigation flood.
 *
 * READY causes the shell to send NAVIGATE immediately. It must therefore wait
 * until GateController's initial preview route is committed; otherwise both
 * sides call router.replace() for the same startup transition and Chromium can
 * throttle the resulting navigation loop.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldAnnouncePreviewReady } from '@/services/previewBridgeState';

const readyState = {
    active: true,
    alreadySent: false,
    serverHydrated: true,
    authBootstrapped: true,
    currentKeyword: 'test',
    initialKeyword: 'test',
};

test('READY waits until server and auth bootstrap have completed', () => {
    assert.equal(
        shouldAnnouncePreviewReady({ ...readyState, serverHydrated: false }),
        false,
    );
    assert.equal(
        shouldAnnouncePreviewReady({ ...readyState, authBootstrapped: false }),
        false,
    );
});

test('READY waits until the requested initial page or modal is visible', () => {
    assert.equal(
        shouldAnnouncePreviewReady({ ...readyState, currentKeyword: null }),
        false,
    );
    assert.equal(
        shouldAnnouncePreviewReady({ ...readyState, currentKeyword: 'home' }),
        false,
    );
    assert.equal(shouldAnnouncePreviewReady(readyState), true);
});

test('READY is announced only once', () => {
    assert.equal(
        shouldAnnouncePreviewReady({ ...readyState, alreadySent: true }),
        false,
    );
    assert.equal(
        shouldAnnouncePreviewReady({ ...readyState, active: false }),
        false,
    );
});
