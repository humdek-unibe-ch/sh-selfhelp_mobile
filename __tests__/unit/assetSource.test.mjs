/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Restricted assets are only served to members of the asset's groups, so the
 * app must send the bearer token with image/video/audio requests to the
 * backend's asset route — and never leak it to any other host.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { assetSource } from '../../components/renderer/assetSource.ts';

const BASE = 'https://cms.example.org';
const UUID = '3f2b8c1e-9a4d-4c7e-8b1a-2d5e6f7a8b9c';

test('a backend asset URL carries the bearer token of a logged-in user', () => {
    assert.deepEqual(assetSource(`/cms-api/v1/assets/${UUID}`, BASE, 'tok'), {
        uri: `${BASE}/cms-api/v1/assets/${UUID}`,
        headers: { Authorization: 'Bearer tok' },
    });
});

test('an anonymous visitor requests the asset without a header (public assets still load)', () => {
    assert.deepEqual(assetSource(`/cms-api/v1/assets/${UUID}`, BASE, null), {
        uri: `${BASE}/cms-api/v1/assets/${UUID}`,
    });
});

test('the token is never sent to another host', () => {
    assert.deepEqual(assetSource(`https://cdn.example.com/cms-api/v1/assets/${UUID}`, BASE, 'tok'), {
        uri: `https://cdn.example.com/cms-api/v1/assets/${UUID}`,
    });
});

test('non-asset backend paths get no header', () => {
    assert.deepEqual(assetSource('/assets/logo.png', BASE, 'tok'), { uri: `${BASE}/assets/logo.png` });
});

test('an empty reference yields no source', () => {
    assert.equal(assetSource('', BASE, 'tok'), null);
    assert.equal(assetSource(undefined, BASE, 'tok'), null);
});
