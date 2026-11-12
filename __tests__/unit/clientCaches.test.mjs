/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Concept rule 3.3 / finding F12: on logout and on a user switch every cache
 * the app keeps for the signed-in user is emptied. A restricted image that was
 * downloaded stays in the expo-image disk cache until that cache is cleared, so
 * the image caches are part of the same step as the query cache.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { clearClientCaches } from '../../services/clientCaches.ts';

const here = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(here, '../..', path), 'utf8');

/** Four steps that record when they ran; `overrides` replaces single steps. */
function steps(calls, overrides = {}) {
    return {
        queryMemory: () => {
            calls.push('queryMemory');
        },
        queryStorage: async () => {
            calls.push('queryStorage');
        },
        imageDisk: async () => {
            calls.push('imageDisk');
            return true;
        },
        imageMemory: async () => {
            calls.push('imageMemory');
            return true;
        },
        ...overrides,
    };
}

test('every cache is emptied: queries (memory and persisted) and images (disk and memory)', async () => {
    const calls = [];
    const failed = await clearClientCaches(steps(calls));

    assert.deepEqual([...calls].sort(), ['imageDisk', 'imageMemory', 'queryMemory', 'queryStorage']);
    assert.deepEqual(failed, []);
});

test('a step that throws does not stop the others and is reported', async () => {
    const calls = [];
    const failed = await clearClientCaches(
        steps(calls, {
            queryMemory: () => {
                calls.push('queryMemory');
                throw new Error('boom');
            },
        }),
    );

    assert.deepEqual([...calls].sort(), ['imageDisk', 'imageMemory', 'queryMemory', 'queryStorage']);
    assert.deepEqual(failed, ['queryMemory']);
});

test('a step that rejects does not stop the others and failures are listed in a fixed order', async () => {
    const calls = [];
    const failed = await clearClientCaches(
        steps(calls, {
            imageMemory: () => Promise.reject(new Error('no memory cache')),
            queryStorage: () => Promise.reject(new Error('storage unavailable')),
        }),
    );

    assert.deepEqual([...calls].sort(), ['imageDisk', 'queryMemory']);
    assert.deepEqual(failed, ['queryStorage', 'imageMemory']);
});

test('signing out never throws, even when every cache step fails', async () => {
    const fail = () => Promise.reject(new Error('nope'));
    const failed = await clearClientCaches({
        queryMemory: () => {
            throw new Error('nope');
        },
        queryStorage: fail,
        imageDisk: fail,
        imageMemory: fail,
    });

    assert.deepEqual(failed, ['queryMemory', 'queryStorage', 'imageDisk', 'imageMemory']);
});

test('a cache that reports false (the web build cannot clear the image cache) is not a failure', async () => {
    const calls = [];
    const failed = await clearClientCaches(
        steps(calls, {
            imageDisk: () => Promise.resolve(false),
            imageMemory: () => Promise.resolve(false),
        }),
    );

    assert.deepEqual(failed, []);
});

test('steps are all started before any of them is awaited', async () => {
    const order = [];
    let release;
    const gate = new Promise((resolve) => {
        release = resolve;
    });
    const pending = clearClientCaches(
        steps(order, {
            queryStorage: async () => {
                order.push('queryStorage:start');
                await gate;
                order.push('queryStorage:end');
            },
        }),
    );

    await Promise.resolve();
    assert.ok(order.includes('imageDisk'), 'a slow persisted-cache write must not hold back the image cache');
    release();
    await pending;
    assert.ok(order.includes('queryStorage:end'));
});

test('clearAuthSession feeds the image caches into the cache step', () => {
    const source = read('services/sessionService.ts');
    assert.match(source, /clearClientCaches\(\{/);
    assert.match(source, /queryMemory: \(\) => appQueryClient\.clear\(\)/);
    assert.match(source, /queryStorage: \(\) => AsyncStorage\.removeItem\(QUERY_PERSIST_KEY\)/);
    assert.match(source, /imageDisk: \(\) => Image\.clearDiskCache\(\)/);
    assert.match(source, /imageMemory: \(\) => Image\.clearMemoryCache\(\)/);
});

test('logout, a rejected refresh and a server switch all clear the caches', () => {
    assert.match(read('services/authService.ts'), /clearAuthSession\(\{ clearQueries: true, reason: 'logout' \}\)/);
    assert.match(read('services/tokenRefreshService.ts'), /clearQueries: true,\s*reason: `refresh-rejected-/);
    assert.match(read('services/tokenRefreshService.ts'), /clearAuthSession\(\{ clearQueries: true, reason: 'refresh-no-access-token' \}\)/);
    assert.match(read('app/(dev)/server-picker.tsx'), /clearAuthSession\(\{ clearQueries: true, resetBootstrap: true, reason: 'server-switch' \}\)/);
});
