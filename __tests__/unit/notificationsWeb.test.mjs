/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Regression coverage for the web notification adapter.
 *
 * The web module must remain a safe no-op so Metro does not evaluate
 * `expo-notifications` and install its unsupported push-token listener.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
    addForegroundNotificationListener,
    addNotificationResponseListener,
    registerForPushNotifications,
} from '../../native/notifications.web.ts';

test('web push registration reports that notifications are unavailable', async () => {
    assert.deepEqual(await registerForPushNotifications(), {
        token: null,
        permissionGranted: false,
        reason: 'web',
    });
});

test('web notification listeners are safe no-ops', () => {
    const removeForeground = addForegroundNotificationListener(() => {
        assert.fail('web foreground notification listener must not run');
    });
    const removeResponse = addNotificationResponseListener(() => {
        assert.fail('web notification response listener must not run');
    });

    assert.doesNotThrow(removeForeground);
    assert.doesNotThrow(removeResponse);
});
