/**
 * TanStack Query client + AsyncStorage persistence so cached page
 * content survives app restarts and offline launches.
 *
 * Stale time defaults to 30s so language switches refetch quickly; per-
 * query overrides win.
 */

import { type ReactNode, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

interface IQueryProviderProps {
    children: ReactNode;
}

const ONE_MINUTE = 60_000;

export function QueryProvider({ children }: IQueryProviderProps): ReactNode {
    const client = useMemo(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 30 * 1000,
                        gcTime: 24 * 60 * ONE_MINUTE,
                        retry: 1,
                        refetchOnWindowFocus: false,
                    },
                    mutations: { retry: 0 },
                },
            }),
        []
    );

    const persister = useMemo(
        () => createAsyncStoragePersister({ storage: AsyncStorage, key: 'sh.rq' }),
        []
    );

    return (
        <PersistQueryClientProvider
            client={client}
            persistOptions={{
                persister,
                maxAge: 24 * 60 * ONE_MINUTE,
                buster: '0.1.0',
            }}
        >
            {children}
        </PersistQueryClientProvider>
    );
}
