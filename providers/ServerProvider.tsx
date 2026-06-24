/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Bootstraps the server URL store from `runtimeConfig` (production builds)
 * or from SecureStore (dev/preview). Renders nothing visible.
 *
 * On Expo Web we normalize loopback hosts to `localhost` so browser-only
 * features such as Mercure cookie auth do not end up split between
 * `localhost` and `127.0.0.1`.
 */

import { useEffect, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { runtimeConfig } from '@/config/runtime';
import { getWebPreviewRuntime } from '@/config/webPreview';
import { SECURE_STORE_KEYS } from '@/constants/secureStore';
import { debugLogger } from '@/services/debugLogger';
import {
    exchangePreviewSession,
    readCachedPreviewSession,
    writeCachedPreviewSession,
} from '@/services/mobilePreviewSession';
import { canonicalizeLoopbackHost } from '@/services/serverSelectionService';
import { secureStore } from '@/services/secureStore';
import {
    ensureServerHydrationCeiling,
    markServerHydratedFailsafe,
} from '@/services/serverHydrationFailsafe';
import { useAuthStore } from '@/stores/authStore';
import { applyWebPreviewSessionOverrides } from '@/stores/devModeStore';
import { useServerStore } from '@/stores/serverStore';

interface IServerProviderProps {
    children: ReactNode;
}

let hydrationPromise: Promise<void> | null = null;

/**
 * Web-preview boot: point the API base at the same-origin `/mobile-preview/api`
 * proxy (or a dev-only `backendUrl` override), exchange the one-time code for a
 * scoped JWT, and mark auth bootstrapped so {@link AuthProvider} skips its
 * refresh-token flow (there is no refresh token in a preview session). Returns
 * true when it handled hydration.
 */
async function hydrateWebPreview(): Promise<boolean> {
    const preview = getWebPreviewRuntime();
    if (!preview.enabled) return false;

    // Resolve an absolute base so downstream consumers (apiClient, health
    // check, query keys) get a stable URL. The same-origin proxy path is made
    // absolute against the current origin; a dev override is already absolute.
    let base = preview.apiBase ?? '';
    if (base.startsWith('/') && typeof window !== 'undefined' && window.location) {
        base = `${window.location.origin}${base}`;
    }

    // Preview never lets the user swap servers; it is pinned to its instance.
    useServerStore.setState({
        bakedBackendUrl: base || null,
        isDevInstance: runtimeConfig.isDevInstance,
        canSwitchServers: false,
    });
    if (base) {
        useServerStore.getState().setServerUrl(base);
    }

    // Session-only dev flags from the embed contract (never persisted).
    applyWebPreviewSessionOverrides({
        previewMode: preview.params.preview,
        deviceFrameEnabled: preview.params.embed ? preview.params.frame : undefined,
        previewDevice: preview.params.device,
        previewOrientation: preview.params.orientation,
    });

    if (base && preview.params.previewSession) {
        const code = preview.params.previewSession;
        // Reuse a still-valid token cached from a prior load of THIS code so a
        // reload (Expo Web HMR, manual refresh, in-app re-auth) does not try to
        // re-exchange the already-consumed one-time code and 401 to a blank pane.
        const cached = readCachedPreviewSession(code);
        if (cached && cached.user) {
            useAuthStore.getState().setSession(cached.accessToken, cached.user);
            debugLogger.info('preview session reused from cache', 'ServerProvider', {
                userId: cached.user.id,
            });
        } else {
            try {
                const session = await exchangePreviewSession(base, code);
                if (session && session.user) {
                    useAuthStore.getState().setSession(session.accessToken, session.user);
                    writeCachedPreviewSession(code, session);
                    debugLogger.info('preview session exchanged', 'ServerProvider', {
                        userId: session.user.id,
                    });
                } else {
                    debugLogger.warn('preview session exchange returned no token', 'ServerProvider');
                }
            } catch (e) {
                debugLogger.warn(
                    `preview session exchange failed: ${(e as Error).message}`,
                    'ServerProvider',
                );
            }
        }
    }

    // Mark auth resolved so the gated Stack mounts without the refresh flow.
    useAuthStore.getState().setBootstrapped(true);
    useServerStore.getState().setHydrated(true);
    debugLogger.info(`web preview hydrated (${base})`, 'ServerProvider');
    return true;
}

async function hydrateServerStore(): Promise<void> {
    if (useServerStore.getState().hydrated) return;

    if (await hydrateWebPreview()) return;

    const normalizeForCurrentPlatform = (url: string): string =>
        Platform.OS === 'web' ? canonicalizeLoopbackHost(url, 'localhost') : url;

    debugLogger.info('hydration start', 'ServerProvider', {
        bakedBackendUrl: runtimeConfig.bakedBackendUrl,
        isDevInstance: runtimeConfig.isDevInstance,
    });
    useServerStore.setState({
        bakedBackendUrl: runtimeConfig.bakedBackendUrl,
        isDevInstance: runtimeConfig.isDevInstance,
        canSwitchServers: runtimeConfig.isDevInstance,
    });

    try {
        if (!runtimeConfig.isDevInstance && runtimeConfig.bakedBackendUrl) {
            const normalized = normalizeForCurrentPlatform(runtimeConfig.bakedBackendUrl);
            useServerStore.getState().setServerUrl(normalized);
            debugLogger.info(`using baked URL ${normalized}`, 'ServerProvider');
            return;
        }

        const stored = await secureStore.get(SECURE_STORE_KEYS.SERVER_URL);
        if (stored) {
            const normalized = normalizeForCurrentPlatform(stored);
            debugLogger.info(`restored server URL ${normalized}`, 'ServerProvider');
            useServerStore.getState().setServerUrl(normalized);
        } else {
            debugLogger.info('no stored server URL -> picker required', 'ServerProvider');
        }
    } finally {
        useServerStore.getState().setHydrated(true);
        debugLogger.info('hydrated', 'ServerProvider');
    }
}

export function ServerProvider({ children }: IServerProviderProps): ReactNode {
    useEffect(() => {
        // Arm the failsafe BEFORE hydration starts so even a synchronous throw or
        // a silent hang in `hydrateServerStore()` can never strand the splash.
        ensureServerHydrationCeiling();
        if (!hydrationPromise) {
            hydrationPromise = hydrateServerStore()
                .catch((e) => {
                    debugLogger.error(
                        `server hydration failed: ${(e as Error).message}`,
                        'ServerProvider',
                    );
                })
                .finally(() => {
                    // Hydration is meant to always end by marking hydrated; this is
                    // the belt-and-suspenders for the rejected/early-return paths.
                    markServerHydratedFailsafe('post-hydrate');
                });
        }

        const unsubscribe = useServerStore.subscribe((state, prev) => {
            if (state.serverUrl === prev.serverUrl) return;
            if (!state.canSwitchServers) return;
            if (state.serverUrl) {
                void secureStore.set(SECURE_STORE_KEYS.SERVER_URL, state.serverUrl);
            } else {
                void secureStore.remove(SECURE_STORE_KEYS.SERVER_URL);
            }
        });

        return () => unsubscribe();
    }, []);

    return children;
}
