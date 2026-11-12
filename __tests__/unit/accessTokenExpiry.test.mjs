/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Image, video and audio requests cannot hand a 401 back for a retry, so the
 * app reads the access token's `exp` claim and renews it BEFORE the request.
 * These tests pin what counts as "expiring" — and that a token whose expiry
 * cannot be read is never reported as expiring (the server's 401 decides).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';

import {
    ACCESS_TOKEN_EXPIRY_SKEW_MS,
    getAccessTokenExpiresAt,
    isAccessTokenExpiring,
} from '../../services/accessTokenExpiry.ts';

const NOW = 1_800_000_000_000;

/** An unsigned JWT-shaped token; the app never verifies the signature. */
function tokenWith(payload) {
    const part = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `header.${part}.signature`;
}

const expiringIn = (ms) => tokenWith({ exp: (NOW + ms) / 1000 });

test('the expiry is read from the exp claim in milliseconds', () => {
    assert.equal(getAccessTokenExpiresAt(tokenWith({ exp: 1_800_000_900 })), 1_800_000_900_000);
});

test('a token without a readable expiry has none', () => {
    assert.equal(getAccessTokenExpiresAt(tokenWith({ sub: 'u1' })), null);
    assert.equal(getAccessTokenExpiresAt(tokenWith({ exp: '1800000900' })), null);
    assert.equal(getAccessTokenExpiresAt(tokenWith({ exp: null })), null);
    assert.equal(getAccessTokenExpiresAt('not-a-jwt'), null);
    assert.equal(getAccessTokenExpiresAt('header.%%%.signature'), null);
    assert.equal(getAccessTokenExpiresAt(`header.${Buffer.from('not json').toString('base64url')}.signature`), null);
});

test('a token with plenty of lifetime left is not expiring', () => {
    assert.equal(isAccessTokenExpiring(expiringIn(60 * 60_000), NOW), false);
    assert.equal(isAccessTokenExpiring(expiringIn(ACCESS_TOKEN_EXPIRY_SKEW_MS + 1), NOW), false);
});

test('an expired token is expiring', () => {
    assert.equal(isAccessTokenExpiring(expiringIn(-1_000), NOW), true);
    assert.equal(isAccessTokenExpiring(expiringIn(-60 * 60_000), NOW), true);
});

test('a token inside the skew window is expiring, the boundary included', () => {
    assert.equal(isAccessTokenExpiring(expiringIn(30_000), NOW), true);
    assert.equal(isAccessTokenExpiring(expiringIn(ACCESS_TOKEN_EXPIRY_SKEW_MS), NOW), true);
});

test('the skew window can be chosen by the caller', () => {
    assert.equal(isAccessTokenExpiring(expiringIn(30_000), NOW, 10_000), false);
    assert.equal(isAccessTokenExpiring(expiringIn(30_000), NOW, 45_000), true);
});

test('a missing token or one without a readable expiry is not reported as expiring', () => {
    assert.equal(isAccessTokenExpiring(null, NOW), false);
    assert.equal(isAccessTokenExpiring(undefined, NOW), false);
    assert.equal(isAccessTokenExpiring('', NOW), false);
    assert.equal(isAccessTokenExpiring(tokenWith({ sub: 'u1' }), NOW), false);
    assert.equal(isAccessTokenExpiring('not-a-jwt', NOW), false);
});

test('without a clock argument the current time is used', () => {
    const soon = tokenWith({ exp: Math.floor(Date.now() / 1000) + 5 });
    const later = tokenWith({ exp: Math.floor(Date.now() / 1000) + 3600 });
    assert.equal(isAccessTokenExpiring(soon), true);
    assert.equal(isAccessTokenExpiring(later), false);
});
