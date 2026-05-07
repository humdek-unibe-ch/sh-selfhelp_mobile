/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Mobile equivalent of the web frontend's `useAclEventStream`.
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

import { ENDPOINTS } from '@selfhelp/shared';

import { getApiClient } from '@/services/apiClient';
import { debugLogger } from '@/services/debugLogger';
import { userDataQueryKey } from '@/services/userService';
import { useAuthStore } from '@/stores/authStore';
import { useServerStore } from '@/stores/serverStore';

type TAclEvent = 'acl-changed';
type TMercureTransport = 'header' | 'cookie';

interface IMercureBootstrap {
    hubUrl: string;
    topic: string;
    token: string | null;
    expiresIn: number;
}

interface IAuthEventsApiResponse {
    data?: IMercureBootstrap;
}

interface IClosableEventSource {
    close: () => void;
}

const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

async function fetchBootstrap(transport: TMercureTransport): Promise<IMercureBootstrap | null> {
    try {
        const resp = await getApiClient().get<IAuthEventsApiResponse>(ENDPOINTS.AUTH.EVENTS, {
            params: transport === 'cookie' ? { transport: 'cookie' } : undefined,
            withCredentials: transport === 'cookie',
        });
        const data = resp.data?.data;
        if (
            !data ||
            typeof data.hubUrl !== 'string' ||
            typeof data.topic !== 'string' ||
            !(typeof data.token === 'string' || data.token === null || typeof data.token === 'undefined')
        ) {
            debugLogger.warn('events bootstrap missing fields', 'aclEvents', { data });
            return null;
        }

        return {
            hubUrl: data.hubUrl,
            topic: data.topic,
            token: typeof data.token === 'string' ? data.token : null,
            expiresIn: typeof data.expiresIn === 'number' ? data.expiresIn : 3_600,
        };
    } catch (e) {
        debugLogger.warn(`events bootstrap failed: ${(e as Error).message}`, 'aclEvents');
        return null;
    }
}

export function useAclEventStream(): void {
    const queryClient = useQueryClient();
    const accessToken = useAuthStore((s) => s.accessToken);
    const bootstrapped = useAuthStore((s) => s.bootstrapped);
    const serverUrl = useServerStore((s) => s.serverUrl);
    const isAuthed = Boolean(accessToken && bootstrapped && serverUrl);

    const stateRef = useRef<{
        es: IClosableEventSource | null;
        reconnectTimer: ReturnType<typeof setTimeout> | null;
        cancelled: boolean;
        delay: number;
    }>({ es: null, reconnectTimer: null, cancelled: false, delay: INITIAL_RECONNECT_DELAY_MS });

    useEffect(() => {
        if (!isAuthed) return;

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

        const invalidateUserData = (): void => {
            debugLogger.info('acl-changed event received -> invalidate user-data', 'aclEvents');
            const baseURL = useServerStore.getState().serverUrl;
            if (!baseURL) return;
            void queryClient.invalidateQueries({ queryKey: userDataQueryKey(baseURL) });
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

            es.addEventListener('acl-changed', invalidateUserData);

            es.addEventListener('error', () => {
                debugLogger.warn('event source error', 'aclEvents');
                scheduleReconnect();
            });
        };

        const attachNativeSource = (url: string, token: string): void => {
            const es = new RNEventSource<TAclEvent>(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            state.es = es;

            es.addEventListener('open', () => {
                debugLogger.info('subscribed', 'aclEvents');
                state.delay = INITIAL_RECONNECT_DELAY_MS;
            });

            es.addEventListener('acl-changed', invalidateUserData);

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
            if (!bootstrap) {
                scheduleReconnect();
                return;
            }

            const url = `${bootstrap.hubUrl}?topic=${encodeURIComponent(bootstrap.topic)}`;
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
            cleanup();
        };
    }, [isAuthed, queryClient]);
}
