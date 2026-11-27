/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Plugin device storage (`host.getPluginStorage`, C29): the keys carry the
 * server, the user (`0` for a guest) and the plugin id, so values of a guest and
 * a signed-in user, of two plugins and of two servers never mix; the total is
 * capped; and `clear()` removes only its own plugin, user and server. The device
 * store is injected, so no React Native module is needed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
    PLUGIN_STORAGE_MAX_BYTES,
    PLUGIN_STORAGE_PREFIX,
    clearAllPluginStorage,
    createPluginStorage,
    pluginStoragePrefix,
    serverKey,
} from '../../services/pluginStorage.ts';

/** An in-memory stand-in for AsyncStorage. */
function memoryStore(initial = {}) {
    const data = new Map(Object.entries(initial));
    return {
        data,
        getAllKeys: async () => [...data.keys()],
        getItem: async (key) => data.get(key) ?? null,
        setItem: async (key, value) => {
            data.set(key, value);
        },
        removeItem: async (key) => {
            data.delete(key);
        },
    };
}

const SERVER = 'https://cms.example.com';

function storageFor(store, state, pluginId = 'sh2-shp-survey-js') {
    return createPluginStorage(store, () => state, pluginId);
}

test('keys carry server, user and plugin id', async () => {
    const store = memoryStore();
    const state = { serverUrl: `${SERVER}/`, userId: 7 };
    await storageFor(store, state).setItem('draft.1', '{"a":1}');

    assert.deepEqual([...store.data.keys()], ['selfhelp.plugin.https%3A%2F%2Fcms%2Eexample%2Ecom.7.sh2-shp-survey-js.draft.1']);
    assert.equal(pluginStoragePrefix(state, 'sh2-shp-survey-js'), 'selfhelp.plugin.https%3A%2F%2Fcms%2Eexample%2Ecom.7.sh2-shp-survey-js.');
    // A trailing slash and letter case do not make a second server.
    assert.equal(serverKey('HTTPS://CMS.example.com/'), serverKey(SERVER));
    assert.equal(serverKey(null), 'none');
    assert.ok(!serverKey(SERVER).includes('.'), 'the server part has no dot, so the prefix is unambiguous');
});

test('a guest and a signed-in user with the same plugin and key do not see each other', async () => {
    const store = memoryStore();
    const state = { serverUrl: SERVER, userId: null };
    const handle = storageFor(store, state);

    await handle.setItem('draft', 'guest draft');
    assert.equal(await handle.getItem('draft'), 'guest draft');
    assert.ok([...store.data.keys()][0].includes('.0.sh2-shp-survey-js.'), 'a guest is user 0');

    // The same handle follows the user who signs in: it never serves the guest's value.
    state.userId = 12;
    assert.equal(await handle.getItem('draft'), null);
    await handle.setItem('draft', 'user draft');
    assert.equal(await handle.getItem('draft'), 'user draft');

    state.userId = null;
    assert.equal(await handle.getItem('draft'), 'guest draft');

    state.userId = 13;
    assert.equal(await storageFor(store, state).getItem('draft'), null, 'another user');
    state.userId = 12;
    state.serverUrl = 'https://other.example.org';
    assert.equal(await handle.getItem('draft'), null, 'another server');
});

test('two plugins keep separate values, and a plugin id is not a prefix of another', async () => {
    const store = memoryStore();
    const state = { serverUrl: SERVER, userId: 1 };
    await storageFor(store, state, 'survey').setItem('k', 'one');
    await storageFor(store, state, 'survey-extra').setItem('k', 'two');
    await storageFor(store, state, 'survey').setItem('extra.k', 'three');

    assert.equal(await storageFor(store, state, 'survey').getItem('k'), 'one');
    assert.equal(await storageFor(store, state, 'survey-extra').getItem('k'), 'two');
    assert.equal(await storageFor(store, state, 'survey').getItem('extra.k'), 'three');
});

test('an invalid plugin id or key throws', async () => {
    const store = memoryStore();
    const state = { serverUrl: SERVER, userId: 1 };

    for (const bad of ['', 'Survey', '1survey', 'sur vey', 'a.b', 'a/b', '../x', undefined, 5]) {
        assert.throws(() => createPluginStorage(store, () => state, bad), /invalid_plugin_id/, String(bad));
    }

    const handle = storageFor(store, state);
    await assert.rejects(handle.getItem(''), /invalid_storage_key/);
    await assert.rejects(handle.setItem('', 'x'), /invalid_storage_key/);
    await assert.rejects(handle.removeItem('x'.repeat(129)), /invalid_storage_key/);
    await handle.setItem('x'.repeat(128), 'ok');
    assert.equal(await handle.getItem('x'.repeat(128)), 'ok');
    assert.equal(store.data.size, 1);
});

test('setItem over 256 KB rejects with plugin_storage_full and leaves the old value', async () => {
    const store = memoryStore();
    const state = { serverUrl: SERVER, userId: 1 };
    const handle = storageFor(store, state);

    await handle.setItem('a', 'x'.repeat(PLUGIN_STORAGE_MAX_BYTES - 10));
    await assert.rejects(handle.setItem('b', 'y'.repeat(100)), /plugin_storage_full/);
    assert.equal(await handle.getItem('b'), null, 'nothing was written');

    // Replacing a key counts the new value, not the old one on top of it.
    await handle.setItem('a', 'z'.repeat(1000));
    assert.equal((await handle.getItem('a')).length, 1000);
    await handle.setItem('b', 'y'.repeat(100));

    // A single value over the cap is refused and the old one stays.
    await assert.rejects(handle.setItem('a', 'q'.repeat(PLUGIN_STORAGE_MAX_BYTES + 1)), /plugin_storage_full/);
    assert.equal((await handle.getItem('a')).length, 1000);

    // The cap is per plugin and user: another plugin or user is not held back by it.
    const full = memoryStore();
    await storageFor(full, state).setItem('a', 'x'.repeat(PLUGIN_STORAGE_MAX_BYTES - 10));
    await storageFor(full, state, 'other-plugin').setItem('a', 'x'.repeat(PLUGIN_STORAGE_MAX_BYTES - 10));
    await storageFor(full, { ...state, userId: 2 }).setItem('a', 'x'.repeat(PLUGIN_STORAGE_MAX_BYTES - 10));
    assert.equal(full.data.size, 3);
});

test('the cap counts bytes, not characters', async () => {
    const store = memoryStore();
    const handle = storageFor(store, { serverUrl: SERVER, userId: 1 });
    // 3 bytes per character: 100,000 characters are 300,000 bytes, over 256 KB.
    await assert.rejects(handle.setItem('k', '€'.repeat(100_000)), /plugin_storage_full/);
    await handle.setItem('k', '€'.repeat(80_000));
});

test('removeItem removes one key and clear() removes only its own plugin, user and server', async () => {
    const store = memoryStore();
    const state = { serverUrl: SERVER, userId: 1 };
    const mine = storageFor(store, state);
    await mine.setItem('a', '1');
    await mine.setItem('b', '2');
    await storageFor(store, state, 'other-plugin').setItem('a', '3');
    await storageFor(store, { ...state, userId: 2 }).setItem('a', '4');
    await storageFor(store, { ...state, userId: null }).setItem('a', '5');
    await storageFor(store, { ...state, serverUrl: 'https://other.example.org' }).setItem('a', '6');
    store.data.set('some.other.app.key', 'untouched');

    await mine.removeItem('a');
    assert.equal(await mine.getItem('a'), null);
    assert.equal(await mine.getItem('b'), '2');

    await mine.clear();
    assert.equal(await mine.getItem('b'), null);
    assert.equal(store.data.size, 5, 'the other plugin, users, server and the unrelated key stay');
    assert.equal(store.data.get('some.other.app.key'), 'untouched');
});

test('clearAllPluginStorage removes every plugin key and nothing else', async () => {
    const store = memoryStore({ 'selfhelp.query-cache': 'keep', unrelated: 'keep' });
    await storageFor(store, { serverUrl: SERVER, userId: 1 }).setItem('a', '1');
    await storageFor(store, { serverUrl: SERVER, userId: null }, 'other-plugin').setItem('a', '2');
    await storageFor(store, { serverUrl: 'https://other.example.org', userId: 9 }).setItem('a', '3');
    assert.equal([...store.data.keys()].filter((k) => k.startsWith(PLUGIN_STORAGE_PREFIX)).length, 3);

    await clearAllPluginStorage(store);

    assert.deepEqual([...store.data.keys()].sort(), ['selfhelp.query-cache', 'unrelated']);
});
