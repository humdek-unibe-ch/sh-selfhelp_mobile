/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * TanStack Query client + AsyncStorage persistence so cached page
 * content survives app restarts and offline launches.
 *
 * Stale time defaults to 30s so language switches refetch quickly; per-
 * query overrides win.
 *
 * **Important:** `persistOptions` MUST keep the same reference across
 * renders. `PersistQueryClientProvider` re-runs its restore-cache
 * effect whenever `persistOptions` changes by reference, which means
 * an inline literal would re-trigger restoration on every render —
 * the entire subtree would unmount, the suspense fallback would re-
 * appear, ServerProvider's effect would fire again, and the auth
 * bootstrap would never complete. Define it once at module scope.
 */

import { type ReactNode } from 'react';
import { Platform } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

import { appQueryClient, QUERY_CACHE_BUSTER, queryPersister } from '@/services/queryClient';

interface IQueryProviderProps {
    children: ReactNode;
}

const PERSIST_OPTIONS = {
    persister: queryPersister,
    maxAge: 24 * 60 * 60_000,
    buster: QUERY_CACHE_BUSTER,
} as const;

export function QueryProvider({ children }: IQueryProviderProps): ReactNode {
    // Expo Web preview is primarily a CMS preview surface. Keeping the
    // browser reload/auth bootstrap stable matters more there than
    // persisting query cache across refreshes, and the persist/restore
    // path has proven eager to remount the tree during startup. Native
    // keeps the persisted cache; web uses the same QueryClient in-memory.
    if (Platform.OS === 'web') {
        return <QueryClientProvider client={appQueryClient}>{children}</QueryClientProvider>;
    }

    return (
        <PersistQueryClientProvider client={appQueryClient} persistOptions={PERSIST_OPTIONS}>
            {children}
        </PersistQueryClientProvider>
    );
}
