/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Mobile-side wrapper around the shared `usePluginRealtime` hook.
 *
 * The shared SDK does not depend on `react-native-sse` (so it stays
 * usable in the Next.js host and during SSR), so each mobile consumer
 * needs to inject the transport. This wrapper does that injection
 * for the entire Expo app — plugins that import
 * `usePluginRealtime` from `@/hooks/usePluginRealtime` automatically
 * subscribe through native SSE on iOS/Android and through the browser
 * `EventSource` when running the web preview.
 *
 * Behavior:
 *   - Native (iOS/Android): uses `react-native-sse` with an
 *     `Authorization: Bearer <token>` header sourced from the auth
 *     store. The shared hook calls `transportFactory(url)`; we build
 *     the `RNEventSource` instance there.
 *   - Web: re-uses the browser-built-in `EventSource` (the shared
 *     hook's default), which carries the HttpOnly Mercure cookie.
 *
 * The wrapper is API-compatible with the shared hook so plugin code
 * can pass the same options regardless of platform.
 */

import { useCallback } from 'react';
import { Platform } from 'react-native';
import RNEventSource from 'react-native-sse';

import {
    usePluginRealtime as usePluginRealtimeShared,
    type IRealtimeTransport,
    type IUsePluginRealtimeOptions,
    type IUsePluginRealtimeResult,
    type TRealtimeTransportFactory,
} from '@selfhelp/shared/plugin-sdk';

import { useAuthStore } from '@/stores/authStore';

/**
 * Builds a transport factory that injects the bearer token into the
 * outgoing SSE request when running natively. On web the shared hook's
 * default `EventSource` transport is used.
 *
 * The shared hook narrows the result with the structural
 * `IRealtimeTransport` interface, so we wrap `RNEventSource` (which
 * already implements `addEventListener`/`removeEventListener`/`close`)
 * but cast through `unknown` to satisfy the readyState contract.
 */
function buildNativeTransportFactory(accessToken: string | null): TRealtimeTransportFactory | undefined {
    if (Platform.OS === 'web') {
        return undefined;
    }
    return (url: string) => {
        const es = new RNEventSource(url, {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        });
        return es as unknown as IRealtimeTransport;
    };
}

export type { IUsePluginRealtimeOptions, IUsePluginRealtimeResult } from '@selfhelp/shared/plugin-sdk';

/**
 * Drop-in mobile replacement for `@selfhelp/shared/plugin-sdk#usePluginRealtime`.
 * The caller does NOT need to specify a `transportFactory` — the wrapper
 * supplies the right one for the current platform. Callers may still
 * override it if they have a more specialized transport.
 */
export function usePluginRealtime<TPayload = unknown>(
    options: IUsePluginRealtimeOptions<TPayload>,
): IUsePluginRealtimeResult<TPayload> {
    const accessToken = useAuthStore((s) => s.accessToken);

    const defaultFactory = useCallback<TRealtimeTransportFactory>((url) => {
        const factory = buildNativeTransportFactory(accessToken);
        if (factory) return factory(url);
        const Ctor = (globalThis as Record<string, unknown>).EventSource as
            | (new (url: string) => IRealtimeTransport)
            | undefined;
        if (!Ctor) {
            throw new Error('No SSE transport available on this platform.');
        }
        return new Ctor(url);
    }, [accessToken]);

    return usePluginRealtimeShared({
        ...options,
        transportFactory: options.transportFactory ?? defaultFactory,
    });
}
