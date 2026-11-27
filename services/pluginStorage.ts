/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Device storage for plugins: `host.getPluginStorage(pluginId)` (C29).
 *
 * A small key-value store for drafts and view state, kept per server, per user
 * (a guest is user `0`) and per plugin, so a signed-in user and a guest never
 * see each other's values. It is not encrypted: no secrets, no tokens. The
 * server still decides everything on submit.
 *
 * Every key is `selfhelp.plugin.<server>.<user>.<pluginId>.<key>`. The server
 * and the key may not break that shape (the server part is encoded, the plugin
 * id has no dot), so clearing one plugin or every plugin is a prefix match.
 *
 * The device store is injected (AsyncStorage in the app; it is `localStorage`
 * in the web preview), so `node --test` covers the key building, the size cap
 * and the clearing. `clearClientCaches` empties all of it
 * (`clearAllPluginStorage`), so logout, a server switch and a rejected token
 * refresh leave nothing behind (concept rule 3.3).
 */
import type { IMobilePluginStorage } from '@selfhelp/shared/plugin-sdk';

/** Every key this module writes starts with this. */
export const PLUGIN_STORAGE_PREFIX = 'selfhelp.plugin.';

/** Total size per plugin, user and server: the keys and values in UTF-8 bytes. 256 KB. */
export const PLUGIN_STORAGE_MAX_BYTES = 256 * 1024;

/** The longest key a plugin may use. */
export const PLUGIN_STORAGE_MAX_KEY_LENGTH = 128;

/** Same pattern as the manifest `id` (`plugin-manifest.schema.json`). */
const PLUGIN_ID_PATTERN = /^[a-z][a-z0-9-]*$/;

/** The part of the device store this module uses (AsyncStorage satisfies it). */
export interface IPluginKeyValueStore {
    getAllKeys: () => Promise<readonly string[]>;
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
}

/** Who is asking: the current server URL and the signed-in user id (`null` for a guest). */
export interface IPluginStorageContext {
    serverUrl: string | null;
    userId: number | null;
}

/** A stable, dot-free key of a server URL. */
export function serverKey(serverUrl: string | null): string {
    const normalized = (serverUrl ?? '').trim().toLowerCase().replace(/\/+$/, '');
    if (normalized === '') return 'none';
    return encodeURIComponent(normalized).replace(/\./g, '%2E');
}

function assertPluginId(pluginId: string): void {
    if (typeof pluginId !== 'string' || !PLUGIN_ID_PATTERN.test(pluginId)) {
        throw new Error('invalid_plugin_id');
    }
}

function assertKey(key: string): void {
    if (typeof key !== 'string' || key.length < 1 || key.length > PLUGIN_STORAGE_MAX_KEY_LENGTH) {
        throw new Error('invalid_storage_key');
    }
}

/** The prefix of everything one plugin keeps for one user on one server. */
export function pluginStoragePrefix(context: IPluginStorageContext, pluginId: string): string {
    assertPluginId(pluginId);
    const user = context.userId !== null && Number.isInteger(context.userId) && context.userId > 0 ? context.userId : 0;
    return `${PLUGIN_STORAGE_PREFIX}${serverKey(context.serverUrl)}.${user}.${pluginId}.`;
}

function byteLength(text: string): number {
    return new TextEncoder().encode(text).length;
}

/**
 * Storage for one plugin. The context is read on every call, so a handle a
 * plugin kept across a login or a server switch follows the current user and
 * server instead of the ones it was created for.
 */
export function createPluginStorage(
    store: IPluginKeyValueStore,
    context: () => IPluginStorageContext,
    pluginId: string,
): IMobilePluginStorage {
    assertPluginId(pluginId);

    const prefix = (): string => pluginStoragePrefix(context(), pluginId);

    return {
        async getItem(key) {
            assertKey(key);
            return store.getItem(prefix() + key);
        },

        async setItem(key, value) {
            assertKey(key);
            const own = prefix();
            const fullKey = own + key;
            const text = String(value);

            let used = 0;
            for (const other of await store.getAllKeys()) {
                if (!other.startsWith(own) || other === fullKey) continue;
                const stored = await store.getItem(other);
                used += byteLength(other.slice(own.length)) + byteLength(stored ?? '');
            }
            if (used + byteLength(key) + byteLength(text) > PLUGIN_STORAGE_MAX_BYTES) {
                throw new Error('plugin_storage_full');
            }
            await store.setItem(fullKey, text);
        },

        async removeItem(key) {
            assertKey(key);
            await store.removeItem(prefix() + key);
        },

        async clear() {
            const own = prefix();
            for (const key of await store.getAllKeys()) {
                if (key.startsWith(own)) await store.removeItem(key);
            }
        },
    };
}

/**
 * Remove every plugin key of every plugin, user and server. This is the
 * `pluginStorage` step of `clearClientCaches`.
 */
export async function clearAllPluginStorage(store: IPluginKeyValueStore): Promise<void> {
    for (const key of await store.getAllKeys()) {
        if (key.startsWith(PLUGIN_STORAGE_PREFIX)) await store.removeItem(key);
    }
}
