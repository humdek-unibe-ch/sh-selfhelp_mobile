/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import test from 'node:test';
import assert from 'node:assert/strict';

import { isExternalNavigationUrl } from '../../components/shell/externalUrl.ts';

test('http(s), mailto, tel, and sms are external', () => {
    assert.equal(isExternalNavigationUrl('https://example.com'), true);
    assert.equal(isExternalNavigationUrl('http://example.com'), true);
    assert.equal(isExternalNavigationUrl('mailto:ada@example.com'), true);
    assert.equal(isExternalNavigationUrl('tel:+411234567'), true);
    assert.equal(isExternalNavigationUrl('sms:+411234567'), true);
});

test('internal CMS paths stay in-app', () => {
    assert.equal(isExternalNavigationUrl('/team-members/5'), false);
    assert.equal(isExternalNavigationUrl('/team-members'), false);
    assert.equal(isExternalNavigationUrl('team-members'), false);
    assert.equal(isExternalNavigationUrl(''), false);
});
