/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Regression coverage for the embedded preview navigation flood.
 *
 * READY causes the shell to send NAVIGATE immediately. Both READY and outbound
 * NAVIGATED messages must therefore wait until GateController's initial
 * preview route is committed; otherwise both sides can change the canonical
 * route during the same startup transition and Chromium can throttle the loop.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
    shouldAnnouncePreviewReady,
    shouldReportPreviewNavigation,
} from '@/services/previewBridgeState';

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

test('navigation is not reported for the temporary route before READY', () => {
    assert.equal(
        shouldReportPreviewNavigation({
            active: true,
            readySent: false,
            currentKeyword: null,
            lastSentKeyword: undefined,
        }),
        false,
    );
});

test('navigation is reported after READY and duplicate routes are ignored', () => {
    assert.equal(
        shouldReportPreviewNavigation({
            active: true,
            readySent: true,
            currentKeyword: 'test',
            lastSentKeyword: undefined,
        }),
        true,
    );
    assert.equal(
        shouldReportPreviewNavigation({
            active: true,
            readySent: true,
            currentKeyword: 'test',
            lastSentKeyword: 'test',
        }),
        false,
    );
    assert.equal(
        shouldReportPreviewNavigation({
            active: false,
            readySent: true,
            currentKeyword: 'test',
            lastSentKeyword: undefined,
        }),
        false,
    );
});
