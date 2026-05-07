import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

const ONE_MINUTE = 60_000;

export const QUERY_PERSIST_KEY = 'sh.rq';
export const QUERY_CACHE_BUSTER = '0.2.0-auth-bootstrap';

export const appQueryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30 * 1000,
            gcTime: 24 * 60 * ONE_MINUTE,
            retry: 1,
            refetchOnWindowFocus: false,
        },
        mutations: { retry: 0 },
    },
});

export const queryPersister = createAsyncStoragePersister({
    storage: AsyncStorage,
    key: QUERY_PERSIST_KEY,
});
