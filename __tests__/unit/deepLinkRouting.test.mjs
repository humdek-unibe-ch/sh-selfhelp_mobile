/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Unit tests for the pure deep-link classifier (`native/deepLinkRouting.ts`,
 * issue #30). This is the decision layer `native/deepLinks.ts` builds on:
 * auth flows + single keywords route locally, parameterized / nested paths are
 * handed off to the DB-driven resolver. Kept free of `expo-*` imports so it runs
 * under the repo's `node --test` wiring with native TypeScript stripping.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { classifyDeepLink } from '../../native/deepLinkRouting.ts';

test('empty / nullish paths classify as none', () => {
    assert.deepEqual(classifyDeepLink(''), { kind: 'none' });
    assert.deepEqual(classifyDeepLink('/'), { kind: 'none' });
    assert.deepEqual(classifyDeepLink(null), { kind: 'none' });
    assert.deepEqual(classifyDeepLink(undefined), { kind: 'none' });
});

test('a single static segment routes locally by keyword', () => {
    assert.deepEqual(classifyDeepLink('login'), { kind: 'keyword', keyword: 'login' });
    assert.deepEqual(classifyDeepLink('/home'), { kind: 'keyword', keyword: 'home' });
});

test('validate links capture snake_case user_id + token as an auth plan', () => {
    assert.deepEqual(classifyDeepLink('/validate/42/abc123'), {
        kind: 'auth',
        keyword: 'validate',
        routeParams: { user_id: '42', token: 'abc123' },
    });
});

test('canonical reset link maps to the reset-password keyword', () => {
    assert.deepEqual(classifyDeepLink('/reset/7/tok'), {
        kind: 'auth',
        keyword: 'reset-password',
        routeParams: { user_id: '7', token: 'tok' },
    });
});

test('the /reset-password/... alias also maps to reset-password', () => {
    assert.deepEqual(classifyDeepLink('/reset-password/7/tok'), {
        kind: 'auth',
        keyword: 'reset-password',
        routeParams: { user_id: '7', token: 'tok' },
    });
});

test('an auth keyword without enough segments is not treated as auth', () => {
    // `/validate` alone is just a keyword; `/reset/7` is missing the token.
    assert.deepEqual(classifyDeepLink('/validate'), { kind: 'keyword', keyword: 'validate' });
    assert.deepEqual(classifyDeepLink('/reset/7'), { kind: 'resolve', path: '/reset/7' });
});

test('parameterized / nested non-auth paths defer to the DB-driven resolver', () => {
    assert.deepEqual(classifyDeepLink('/team/5'), { kind: 'resolve', path: '/team/5' });
    assert.deepEqual(classifyDeepLink('help/getting-started'), {
        kind: 'resolve',
        path: '/help/getting-started',
    });
});

test('leading and duplicate slashes are tolerated', () => {
    assert.deepEqual(classifyDeepLink('///team//5'), { kind: 'resolve', path: '/team/5' });
});
