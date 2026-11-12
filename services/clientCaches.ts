/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Empties every cache the app keeps on the device for the signed-in user.
 *
 * Those are the React Query cache, its persisted copy, and the expo-image disk
 * and memory caches. The image caches matter because an uploaded asset that is
 * restricted to groups is stored there once it was downloaded, and would stay
 * readable after logout or a user switch (concept rule 3.3, finding F12).
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
}

export type TClientCacheStep = keyof IClientCacheSteps;

const STEP_ORDER: readonly TClientCacheStep[] = ['queryMemory', 'queryStorage', 'imageDisk', 'imageMemory'];

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
