/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Empties every cache the app keeps on the device for the signed-in user.
 *
 * Those are the React Query cache, its persisted copy, the expo-image disk
 * and memory caches, the files of earlier record versions a person
 * downloaded, and the device storage plugins keep (`host.getPluginStorage`:
 * drafts and view state per server, user and plugin). The image caches matter
 * because an uploaded asset that is restricted to groups is stored there once it
 * was downloaded, and would stay readable after logout or a user switch
 * (concept rule 3.3, finding F12); a downloaded file of an old version and a
 * plugin's saved draft are the same kind of private copy.
 *
 * The steps are injected so this module has no React Native imports and
 * `node --test` can cover it. Every step runs even when another one fails, and
 * a failing step never throws: signing out must always finish.
 */

export interface IClientCacheSteps {
    /** In-memory React Query cache. */
    queryMemory: () => void;
    /** Persisted copy of the React Query cache (AsyncStorage). */
    queryStorage: () => Promise<unknown>;
    /** expo-image disk cache: downloaded images, restricted ones included. */
    imageDisk: () => Promise<unknown>;
    /** expo-image memory cache. */
    imageMemory: () => Promise<unknown>;
    /** Files of earlier record versions the person downloaded (form list history), kept in the app cache. */
    historyFiles: () => Promise<unknown>;
    /** Device storage of the plugins (`selfhelp.plugin.*` keys, every plugin, user and server). */
    pluginStorage: () => Promise<unknown>;
}

export type TClientCacheStep = keyof IClientCacheSteps;

const STEP_ORDER: readonly TClientCacheStep[] = [
    'queryMemory',
    'queryStorage',
    'imageDisk',
    'imageMemory',
    'historyFiles',
    'pluginStorage',
];

/** Run every cache step. Resolves with the names of the steps that threw, in a fixed order. */
export async function clearClientCaches(steps: IClientCacheSteps): Promise<TClientCacheStep[]> {
    const failed = new Set<TClientCacheStep>();

    await Promise.all(
        STEP_ORDER.map(async (name) => {
            try {
                await steps[name]();
            } catch {
                failed.add(name);
            }
        }),
    );

    return STEP_ORDER.filter((name) => failed.has(name));
}
