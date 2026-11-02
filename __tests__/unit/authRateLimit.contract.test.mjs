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
import { formatRateLimitMessage, getRateLimitRetryAfter } from '@selfhelp/shared';

const here = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(here, '../..', path), 'utf8');

test('a direct backend 429 yields the same wait and message as on web', () => {
    // Mobile calls Symfony directly, so the Retry-After header is also present.
    const error = { response: { status: 429, headers: { 'retry-after': '896' }, data: { data: { retry_after: 896 } } } };
    const retryAfter = getRateLimitRetryAfter(error);
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

test('a wrong password (401) is not treated as rate-limited', () => {
    assert.equal(getRateLimitRetryAfter({ response: { status: 401, data: {} } }), null);
});

test('the auth service maps a 429 to a rate-limited result for login and 2FA', () => {
    const source = read('services/authService.ts');
    assert.match(source, /kind: 'rate-limited'; retryAfter: number/);
    assert.equal(source.match(/getRateLimitRetryAfter\(e\)/g)?.length, 2, 'both login() and verifyTwoFactor() check for 429');
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
