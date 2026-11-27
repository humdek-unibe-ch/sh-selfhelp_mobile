/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Mobile equivalent of the web frontend's live-sync stream.
 *
 * What it listens to: the Mercure topics the backend names in `GET /auth/events` (`syncTopics`): for a
 * signed-in person their own, their groups', their roles' and the public topic, for a guest the public one
 * (live-sync contract C4). A `changed` message carries tags, never content; `services/syncApply.ts` maps
 * them to the pages, menus and lists that are read again. An older core that names only the access topic is
 * still served through `acl-changed`.
 *
 * When it listens: only while the app is open in the foreground (decision 2026-11-20). Going to the
 * background closes the stream; coming back opens a new one with a fresh bootstrap and reads again what is on
 * screen, because nothing was heard in between. A message with the tag `acl` also reconnects, so the topic list
 * follows the person's groups and roles.
 *
 * Transport split:
 *   - Native iOS/Android: subscribe directly with `react-native-sse` and
 *     `Authorization: Bearer <token>`.
 *   - Web preview: ask the backend to mint an HttpOnly Mercure cookie and
 *     connect with the browser's native `EventSource`.
 */

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import RNEventSource, { type ErrorEvent } from 'react-native-sse';

import { ENDPOINTS, SYNC_EVENT_NAME } from '@selfhelp/shared';

import { getWebPreviewRuntime } from '@/config/webPreview';
import { useAppForeground } from '@/hooks/useAppForeground';
import { getApiClient } from '@/services/apiClient';
import { debugLogger } from '@/services/debugLogger';
import { applySyncTags, type ISyncApplyOptions } from '@/services/syncApply';
import {
    createSyncDispatcher,
    needsCatchUp,
    parseBootstrap,
    shouldStream,
    subscribeUrl,
    type ISyncBootstrap,
} from '@/services/syncStream';
import { userDataQueryKey } from '@/services/userService';
import { useAuthStore } from '@/stores/authStore';
import { useServerStore } from '@/stores/serverStore';

type TStreamEvent = typeof SYNC_EVENT_NAME | 'acl-changed';
type TMercureTransport = 'header' | 'cookie';

/** A bootstrap the server refused (401, 403, 404): nothing to retry until the sign-in state or the server changes. */
interface IBootstrapRefused {
    refused: true;
}

interface IClosableEventSource {
    close: () => void;
}

const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const REFUSED_STATUSES: readonly number[] = [401, 403, 404];

async function fetchBootstrap(transport: TMercureTransport): Promise<ISyncBootstrap | IBootstrapRefused | null> {
    try {
        const resp = await getApiClient().get<{ data?: unknown }>(ENDPOINTS.AUTH.EVENTS, {
            params: transport === 'cookie' ? { transport: 'cookie' } : undefined,
            withCredentials: transport === 'cookie',
        });
        const bootstrap = parseBootstrap(resp.data?.data);
        if (!bootstrap) {
            debugLogger.warn('events bootstrap missing fields', 'aclEvents', { data: resp.data?.data });
        }
        return bootstrap;
    } catch (e) {
        const status = (e as { response?: { status?: number } }).response?.status;
        if (typeof status === 'number' && REFUSED_STATUSES.includes(status)) {
            // An older core answers a guest with 401: there is nothing to listen to, and no reason to knock again.
            debugLogger.info(`events bootstrap refused (${status})`, 'aclEvents');
            return { refused: true };
        }
        debugLogger.warn(`events bootstrap failed: ${(e as Error).message}`, 'aclEvents');
        return null;
    }
}

export function useAclEventStream(): void {
    const queryClient = useQueryClient();
    const signedIn = useAuthStore((s) => Boolean(s.accessToken));
    const bootstrapped = useAuthStore((s) => s.bootstrapped);
    const serverUrl = useServerStore((s) => s.serverUrl);
    const foreground = useAppForeground();
    // The CMS Live Preview is a READ-ONLY, ephemeral session: there is no live
    // admin session to keep in sync, and its Bearer-scoped token cannot open the
    // Mercure auth-events stream (the `auth/events` route is outside the preview
    // allowlist and the web cookie transport carries no Mercure cookie). Trying
    // would only 403 in an exponential-backoff reconnect loop, so skip it.
    const isPreview = getWebPreviewRuntime().enabled;
    const ready = Boolean(bootstrapped && serverUrl);
    // A guest listens too (the public topic): the stream follows the app, not the sign-in.
    const streaming = shouldStream({ ready, preview: isPreview, foreground });

    const stateRef = useRef<{
        es: IClosableEventSource | null;
        reconnectTimer: ReturnType<typeof setTimeout> | null;
        cancelled: boolean;
        delay: number;
    }>({ es: null, reconnectTimer: null, cancelled: false, delay: INITIAL_RECONNECT_DELAY_MS });

    // What was in the background heard nothing: on return, everything on screen is read again.
    const wasBackgroundRef = useRef(false);
    useEffect(() => {
        if (!foreground) {
            wasBackgroundRef.current = true;
            return;
        }
        if (!needsCatchUp(wasBackgroundRef.current, foreground)) {
            return;
        }
        wasBackgroundRef.current = false;
        if (!ready || isPreview) {
            return;
        }
        const baseURL = useServerStore.getState().serverUrl;
        applySyncTags(['acl'], queryClient, { userDataKey: userDataKeyOf(baseURL, useAuthStore.getState().accessToken) });
    }, [foreground, ready, isPreview, queryClient]);

    useEffect(() => {
        if (!streaming) return undefined;

        const state = stateRef.current;
        state.cancelled = false;
        state.delay = INITIAL_RECONNECT_DELAY_MS;

        const cleanup = (): void => {
            if (state.reconnectTimer) {
                clearTimeout(state.reconnectTimer);
                state.reconnectTimer = null;
            }
            if (state.es) {
                try {
                    state.es.close();
                } catch {
                    /* ignore */
                }
                state.es = null;
            }
        };

        const scheduleReconnect = (): void => {
            if (state.cancelled) return;
            cleanup();
            const delay = state.delay;
            state.delay = Math.min(state.delay * 2, MAX_RECONNECT_DELAY_MS);
            debugLogger.info(`reconnect in ${delay}ms`, 'aclEvents');
            state.reconnectTimer = setTimeout(() => {
                void connect();
            }, delay);
        };

        const applyOptions = (): ISyncApplyOptions => ({
            userDataKey: userDataKeyOf(useServerStore.getState().serverUrl, useAuthStore.getState().accessToken),
        });

        // The topics follow the person's groups and roles: after an access change a new bootstrap is fetched.
        const reconnectNow = (): void => {
            if (state.cancelled) return;
            cleanup();
            state.delay = INITIAL_RECONNECT_DELAY_MS;
            void connect();
        };

        const dispatcher = createSyncDispatcher({
            apply: (tags) => {
                debugLogger.info(`changed: ${tags.join(', ')}`, 'aclEvents');
                return applySyncTags(tags, queryClient, applyOptions());
            },
            onRebootstrap: reconnectNow,
        });

        // The access topic of an older core: every access change of the person reads everything again.
        const onLegacyAclChanged = (): void => {
            debugLogger.info('acl-changed event received -> invalidate user-data, pages, menus and lists', 'aclEvents');
            applySyncTags(['acl'], queryClient, applyOptions());
        };

        const attachBrowserSource = (url: string): void => {
            const BrowserEventSource = globalThis.EventSource;
            if (!BrowserEventSource) {
                throw new Error('Browser EventSource is not available');
            }

            const es = new BrowserEventSource(url, { withCredentials: true });
            state.es = es;

            es.addEventListener('open', () => {
                debugLogger.info('subscribed', 'aclEvents');
                state.delay = INITIAL_RECONNECT_DELAY_MS;
            });

            es.addEventListener(SYNC_EVENT_NAME, (event) => dispatcher.receive(String(event.data ?? '')));
            es.addEventListener('acl-changed', onLegacyAclChanged);

            es.addEventListener('error', () => {
                debugLogger.warn('event source error', 'aclEvents');
                scheduleReconnect();
            });
        };

        const attachNativeSource = (url: string, token: string): void => {
            const es = new RNEventSource<TStreamEvent>(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            state.es = es;

            es.addEventListener('open', () => {
                debugLogger.info('subscribed', 'aclEvents');
                state.delay = INITIAL_RECONNECT_DELAY_MS;
            });

            es.addEventListener(SYNC_EVENT_NAME, (event) => dispatcher.receive(event.data ?? ''));
            es.addEventListener('acl-changed', onLegacyAclChanged);

            es.addEventListener('error', (event) => {
                const message = (event as ErrorEvent).message;
                debugLogger.warn(`event source error${message ? `: ${message}` : ''}`, 'aclEvents');
                scheduleReconnect();
            });
        };

        const connect = async (): Promise<void> => {
            if (state.cancelled) return;

            const transport: TMercureTransport = Platform.OS === 'web' ? 'cookie' : 'header';
            const bootstrap = await fetchBootstrap(transport);
            if (state.cancelled) return;
            if (bootstrap !== null && 'refused' in bootstrap) {
                // The effect runs again when the sign-in state changes; until then there is nothing to listen to.
                return;
            }
            if (!bootstrap) {
                scheduleReconnect();
                return;
            }

            debugLogger.info(
                `bootstrap ok (${transport})`,
                'aclEvents',
                transport === 'cookie'
                    ? {
                          note: 'mercureAuthorization is HttpOnly; check browser storage/network headers, not document.cookie',
                      }
                    : { hasToken: Boolean(bootstrap.token), topics: bootstrap.syncTopics.length }
            );

            const url = subscribeUrl(bootstrap);
            debugLogger.info(`subscribe ${url}`, 'aclEvents');

            try {
                if (transport === 'cookie') {
                    attachBrowserSource(url);
                } else {
                    if (!bootstrap.token) {
                        throw new Error('Mercure header transport requires a bootstrap token');
                    }
                    attachNativeSource(url, bootstrap.token);
                }
            } catch (e) {
                debugLogger.warn(`EventSource init failed: ${(e as Error).message}`, 'aclEvents');
                scheduleReconnect();
                return;
            }

            const refreshIn = Math.max((bootstrap.expiresIn - 30) * 1000, 60_000);
            state.reconnectTimer = setTimeout(() => {
                debugLogger.info('subscriber token nearing expiry -> renewing', 'aclEvents');
                scheduleReconnect();
            }, refreshIn);
        };

        void connect();

        return () => {
            state.cancelled = true;
            dispatcher.dispose();
            cleanup();
        };
        // A refreshed token of the same person keeps the stream; the sign-in state and the foreground decide.
    }, [streaming, signedIn, queryClient]);
}

/** The key of the user data to read again; null for a guest (no user data). */
function userDataKeyOf(serverUrl: string | null, accessToken: string | null): readonly unknown[] | null {
    return serverUrl && accessToken ? userDataQueryKey(serverUrl) : null;
}
