/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Runtime configuration helpers.
 *
 * Reads `extra` from `expo-constants` (populated from `app.config.ts`) so
 * the rest of the app doesn't have to know about `Constants.expoConfig`.
 */

import Constants from 'expo-constants';

interface IExtra {
    instanceSlug: string;
    bakedBackendUrl: string | null;
    serverSelectionUrl: string | null;
    isDevInstance: boolean;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<IExtra>;

export const runtimeConfig = {
    instanceSlug: extra.instanceSlug ?? 'dev',
    bakedBackendUrl: extra.bakedBackendUrl ?? null,
    serverSelectionUrl: extra.serverSelectionUrl ?? null,
    isDevInstance: extra.isDevInstance ?? true,
};

export type TRuntimeConfig = typeof runtimeConfig;
