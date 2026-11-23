/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Live sync, mobile (task `2026-11-20-live-sync-and-edit-lock`, P5-A1): what each `changed` tag reads again.
 * A fake query cache records which cached queries an invalidation would touch.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
    applySyncTags,
    invalidateAccessQueries,
    pageIdOfFormListKey,
} from '../../services/syncApply.ts';

const USER_KEY = ['user-data', 'https://x.test'];

function page(id, dependsOn) {
    return { queryKey: ['page', 'https://x.test', `p${id}`], state: { data: { id, sync: { depends_on: dependsOn, valid_until: null } } } };
}

function list(pageId) {
    return { queryKey: ['form-list', 'https://x.test', 'u', 'en', 'ios', pageId, 7, ''], state: { data: {} } };
}

function fakeCache(queries) {
    const touched = [];
    const calls = [];
    return {
        touched,
        calls,
        invalidateQueries(filters, options) {
            calls.push({ root: filters.queryKey[0], options });
            for (const query of queries) {
                const matchesRoot = filters.queryKey.every((part, i) => query.queryKey[i] === part);
                if (matchesRoot && (!filters.predicate || filters.predicate(query))) {
                    touched.push(query.queryKey.join('|'));
                }
            }
        },
        getQueryCache: () => ({
            findAll: (filters) => queries.filter((q) => filters.queryKey.every((part, i) => q.queryKey[i] === part)),
        }),
    };
}

const world = () => [
    page(1, ['page:1', 'table:10']),
    page(2, ['page:2', 'global_values']),
    page(3, []),
    list(1),
    list(2),
    list(3),
    { queryKey: ['navigation', 'https://x.test'], state: { data: {} } },
    { queryKey: ['pages', 'https://x.test'], state: { data: [] } },
    { queryKey: USER_KEY, state: { data: {} } },
];

const options = { userDataKey: USER_KEY };

test('page:<id> reads again only the page that named it and the lists on that page', () => {
    const cache = fakeCache(world());
    const result = applySyncTags(['page:1'], cache, options);
    assert.deepEqual(result, { rebootstrap: false });
    assert.deepEqual(cache.touched.sort(), [
        'form-list|https://x.test|u|en|ios|1|7|',
        'page|https://x.test|p1',
    ]);
});

test('table:<id> reads again the pages that depend on the table', () => {
    const cache = fakeCache(world());
    applySyncTags(['table:10'], cache, options);
    assert.deepEqual(cache.touched.sort(), [
        'form-list|https://x.test|u|en|ios|1|7|',
        'page|https://x.test|p1',
    ]);
});

test('global_values reads again the pages that use a global value, not the others', () => {
    const cache = fakeCache(world());
    applySyncTags(['global_values'], cache, options);
    assert.deepEqual(cache.touched.sort(), [
        'form-list|https://x.test|u|en|ios|2|7|',
        'page|https://x.test|p2',
    ]);
});

test('navigation reads again the menus and the page list and no page', () => {
    const cache = fakeCache(world());
    applySyncTags(['navigation'], cache, options);
    assert.deepEqual(cache.touched.sort(), ['navigation|https://x.test', 'pages|https://x.test']);
});

test('a tag nobody depends on, and editor tags, read nothing', () => {
    const cache = fakeCache(world());
    applySyncTags(['page:99', 'page_lock:1', 'section:4', 'asset:2'], cache, options);
    assert.deepEqual(cache.touched, []);
});

test('acl reads again user data, pages, navigation and lists, and asks for a new bootstrap', () => {
    const cache = fakeCache(world());
    const result = applySyncTags(['acl'], cache, options);
    assert.deepEqual(result, { rebootstrap: true });
    const roots = new Set(cache.calls.map((call) => call.root));
    for (const root of ['user-data', 'pages', 'page', 'navigation', 'form-list', 'form-list-history']) {
        assert.ok(roots.has(root), `${root} is read again`);
    }
    assert.ok(cache.touched.includes('user-data|https://x.test'));
});

test('acl as a guest has no user data to read', () => {
    const cache = fakeCache(world());
    applySyncTags(['acl'], cache, { userDataKey: null });
    assert.ok(!cache.calls.some((call) => call.root === 'user-data'));
});

test('an access read keeps a read that already runs (cancelRefetch false), so one change reads once', () => {
    const cache = fakeCache(world());
    invalidateAccessQueries(cache);
    assert.ok(cache.calls.every((call) => call.options?.cancelRefetch === false));
});

test('the page of a list is read from its key', () => {
    assert.equal(pageIdOfFormListKey(['form-list', 's', 'u', 'en', 'ios', 5, 1]), 5);
    assert.equal(pageIdOfFormListKey(['page', 's', 'u', 'en', 'ios', 5]), null);
});
