/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Mobile must build `/pages/resolve` exclusively through shared
 * `buildPagesResolveUrl` so encoding matches frontend SSR + browser client.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
    API_VERSION_PREFIX,
    buildPagesResolvePath,
    buildPagesResolveUrl,
} from '@selfhelp/shared';

const here = dirname(fileURLToPath(import.meta.url));
const pageService = readFileSync(
    join(here, '../../services/pageService.ts'),
    'utf8',
);

test('pageService imports and calls buildPagesResolveUrl', () => {
    assert.match(pageService, /buildPagesResolveUrl/);
    assert.match(pageService, /buildPagesResolveUrl\(\{/);
    assert.doesNotMatch(pageService, /ENDPOINTS\.PAGES\.RESOLVE\(/);
    assert.doesNotMatch(pageService, /`\$\{.*\}\/pages\/resolve/);
});

test('shared resolve encoding matches frontend BFF path + mobile full URL', () => {
    const params = { path: '/team-members/5', languageId: 2, preview: true };
    const bff = buildPagesResolvePath(params);
    const full = buildPagesResolveUrl(params);
    assert.equal(
        bff,
        '/pages/resolve?path=%2Fteam-members%2F5&language_id=2&preview=true',
    );
    assert.equal(full, `${API_VERSION_PREFIX}${bff}`);
});
