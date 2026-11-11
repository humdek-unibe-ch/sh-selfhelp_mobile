/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Mobile login / 2FA / reset-password must render the backend 429 exactly like the web
 * renderers: the CMS `alert_rate_limited` text with `{minutes}` filled in by
 * the shared helpers (same fixtures as the frontend LoginStyle tests).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { formatRateLimitMessage } from '@selfhelp/shared';

import { authFailure } from '../../services/authFailure.ts';

const here = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(here, '../..', path), 'utf8');

test('a direct backend 429 yields the same wait and message as on web', () => {
    // Mobile calls Symfony directly, so the Retry-After header is also present.
    const error = { response: { status: 429, headers: { 'retry-after': '896' }, data: { data: { retry_after: 896 } } } };
    const result = authFailure(error);
    assert.equal(result.kind, 'rate-limited');
    const retryAfter = result.kind === 'rate-limited' ? result.retryAfter : 0;
    assert.equal(retryAfter, 896);
    assert.equal(
        formatRateLimitMessage('Zu viele Versuche. Bitte in {minutes} Min. erneut versuchen.', retryAfter),
        'Zu viele Versuche. Bitte in 15 Min. erneut versuchen.',
    );
    assert.equal(
        formatRateLimitMessage(undefined, retryAfter),
        'Too many failed attempts. Please try again in 15 min.',
    );
});

test('a backend 429 becomes a rate-limited result carrying the wait in seconds', () => {
    const error = Object.assign(new Error('Request failed with status code 429'), {
        response: { status: 429, headers: { 'retry-after': '896' }, data: { data: { retry_after: 896 } } },
    });
    assert.deepEqual(authFailure(error), { kind: 'rate-limited', retryAfter: 896 });
});

test('a 429 without any wait hint is still rate-limited (shown as a short wait)', () => {
    const result = authFailure(Object.assign(new Error('429'), { response: { status: 429, headers: {}, data: {} } }));
    assert.equal(result.kind, 'rate-limited');
});

test('a wrong password (401) is a plain error with the request message', () => {
    const error = Object.assign(new Error('Request failed with status code 401'), { response: { status: 401, data: {} } });
    assert.deepEqual(authFailure(error), { kind: 'error', message: 'Request failed with status code 401' });
});

test('a network failure without a response is a plain error', () => {
    assert.deepEqual(authFailure(new Error('Network Error')), { kind: 'error', message: 'Network Error' });
});

test('login() and verifyTwoFactor() both report failures through authFailure', () => {
    const source = read('services/authService.ts');
    assert.ok((source.match(/return authFailure\(e\);/g) ?? []).length >= 2, 'both auth calls must map their errors with authFailure');
});

test('ResetPassword shows the CMS alert_rate_limited text inline on a 429', () => {
    const source = read('components/styles/auth/ResetPassword.tsx');
    assert.match(source, /useInterpolatedField\(section, 'alert_rate_limited', values\)/);
    assert.match(source, /getRateLimitRetryAfter\(e\)/);
    assert.match(source, /formatRateLimitMessage\(alertRateLimited, retryAfter\)/);
});

for (const [name, path] of [
    ['Login', 'components/styles/auth/Login.tsx'],
    ['TwoFactorAuth', 'components/styles/auth/TwoFactorAuth.tsx'],
]) {
    test(`${name} renders the CMS alert_rate_limited field through the shared formatter`, () => {
        const source = read(path);
        assert.match(source, /useInterpolatedField\(section, 'alert_rate_limited', values\)/);
        assert.match(source, /res\.kind === 'rate-limited'/);
        assert.match(source, /formatRateLimitMessage\(alertRateLimited, res\.retryAfter\)/);
    });
}
