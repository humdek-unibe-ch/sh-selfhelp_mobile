/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Contract for the authenticated asset requests that `node --test` cannot run
 * (they need React effects and the native players). The pure parts are covered
 * by `assetSource.test.mjs` and `accessTokenExpiry.test.mjs`; these checks pin
 * how the hook and the image style use them, so the behaviour cannot be
 * dropped by accident.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(here, '../..', path), 'utf8');

const hook = read('components/renderer/useAssetSource.ts');

test('an expiring token is renewed before a protected asset request goes out', () => {
    assert.match(hook, /isAccessTokenExpiring\(accessToken\)/);
    assert.match(hook, /refreshAccessToken\(\)/);
    // The source is withheld while the renewal runs, then returned.
    assert.match(hook, /return waiting \? null : source;/);
});

test('only a request that carries the token is held back', () => {
    assert.match(hook, /source\?\.headers !== undefined/);
});

test('a stale token is renewed once, never in a loop', () => {
    assert.match(hook, /setSettledToken\(next \?\? accessToken\)/);
    assert.match(hook, /settledToken !== accessToken/);
});

test('the renewal goes through the shared single-flight refresh, nothing else', () => {
    assert.match(hook, /from '@\/services\/tokenRefreshService'/);
    assert.doesNotMatch(hook, /axios|secureStore|REFRESH_TOKEN/);
});

test('the web preview holds a short-lived token without a refresh token and is left alone', () => {
    assert.match(hook, /!getWebPreviewRuntime\(\)\.enabled/);
});

test('every media style reads its source through the hook', () => {
    for (const path of [
        'components/styles/media/ImageStyle.tsx',
        'components/styles/media/Figure.tsx',
        'components/styles/media/VideoStyle.tsx',
        'components/styles/media/AudioStyle.tsx',
    ]) {
        assert.match(read(path), /useAssetSource\(/, `${path} must use useAssetSource`);
    }
});

test('the image fallback check is skipped on web for a request that needs a header', () => {
    const image = read('components/styles/media/ImageStyle.tsx');
    assert.match(image, /Platform\.OS === 'web' && primary\.headers/);
    // The native check still sends the header.
    assert.match(image, /Image\.prefetch\(primary\.uri, \{ headers: primary\.headers \}\)/);
});
