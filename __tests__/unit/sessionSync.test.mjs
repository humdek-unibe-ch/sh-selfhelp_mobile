/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Live sync follow-ups, mobile (P5-A1, P5-A2): no user-data poll; catch-up on
 * foreground return and on a differing X-Acl-Stamp.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { createAclStampWatcher } from '../../services/aclStamp.ts';
import { applySyncTags } from '../../services/syncApply.ts';
import { needsCatchUp } from '../../services/syncStream.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const source = (path) => readFileSync(join(root, path), 'utf8');

function listProviderSources() {
    const dir = join(root, 'providers');
    return readdirSync(dir)
        .filter((name) => name.endsWith('.ts') || name.endsWith('.tsx'))
        .map((name) => ({ name, text: source(join('providers', name)) }));
}

test('no timer invalidates user data while the app stays in the foreground (P5-A1)', () => {
    for (const file of listProviderSources()) {
        assert.doesNotMatch(
            file.text,
            /USER_POLL_FALLBACK|useUserDataPollingFallback/,
            `${file.name} must not poll user data`,
        );
        assert.doesNotMatch(file.text, /setInterval/, `${file.name} must not set an interval`);
    }

    // Staying in the foreground with no background spell never triggers catch-up,
    // so nothing reapplies the acl tag that would refetch user data.
    assert.equal(needsCatchUp(false, true), false);
});

test('returning to the foreground reads user data again (P5-A2)', () => {
    assert.equal(needsCatchUp(true, true), true);

    const stream = source('hooks/useAclEventStream.ts');
    assert.match(
        stream,
        /needsCatchUp\(wasBackgroundRef\.current, foreground\)/,
        'the stream watches foreground return',
    );
    assert.match(
        stream,
        /applySyncTags\(\['acl'\], queryClient/,
        'foreground catch-up applies the acl tag',
    );

    const touched = [];
    const cache = {
        getQueryCache: () => ({ findAll: () => [] }),
        invalidateQueries: (filters) => {
            touched.push(String(filters.queryKey?.[0] ?? ''));
        },
    };
    applySyncTags(['acl'], cache, { userDataKey: ['user-data', 'https://x.test'] });
    assert.ok(touched.includes('user-data'), 'acl catch-up invalidates user data');
});

test('a differing X-Acl-Stamp invalidates user data (P5-A2)', () => {
    let invalidations = 0;
    const watcher = createAclStampWatcher({
        known: () => 'aaa',
        invalidate: () => {
            invalidations += 1;
        },
    });
    watcher.observe('bbb');
    watcher.observe('bbb');
    assert.equal(invalidations, 1);
});
