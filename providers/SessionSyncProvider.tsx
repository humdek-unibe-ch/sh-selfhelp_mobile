/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Keeps the authenticated session in sync with the backend after the
 * initial bootstrap.
 *
 * Concretely it does four things:
 *
 *   1. Holds the long-lived `['user-data', serverUrl]` query observer
 *      so any component using `useAuthStore.user` sees the latest
 *      payload (id, name, language, `acl_version`, …).
 *   2. Watches `user.acl_version` and surgically invalidates `pages`
 *      and `page` queries whenever the server bumps it. Same pattern
 *      as the web frontend's `useAclVersionWatcher`.
 *   3. Subscribes to the backend's Mercure ACL stream via
 *      `useAclEventStream`. On `acl-changed` it invalidates user-data
 *      immediately, the watcher above sees the bumped version, and
 *      page/menu caches refresh without any user interaction. This is
 *      the same wire contract as the web frontend.
 *   4. Falls back to a slow safety-net poll (every 5 minutes) so a
 *      missed Mercure event (e.g. CORS-blocked dev preview, hub down,
 *      flaky network) eventually catches up.
 *
 * The Mercure hub does not allow cross-origin browser subscriptions
 * from arbitrary origins. For Expo Web preview, ensure the hub's
 * `cors_origins` directive includes the Expo dev server origin (see
 * the backend `docker-compose.mercure.yml` and `docs/auth-bootstrap.md`).
 * On native (iOS/Android) there is no Origin header so CORS is a non-
 * issue.
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAclEventStream } from '@/hooks/useAclEventStream';
import { fetchCurrentUser, userDataQueryKey } from '@/services/userService';
import { useAuthStore } from '@/stores/authStore';
import { useServerStore } from '@/stores/serverStore';

interface ISessionSyncProviderProps {
    children: ReactNode;
}

/**
 * Safety-net poll. Mercure events are the primary live-update channel;
 * this only kicks in if the SSE subscription is unavailable (CORS-
 * blocked dev preview, intermittent hub outage). 5 minutes is gentle
 * enough that a logged-in tab leaves no visible traffic on the network
 * panel and aggressive enough that an ACL change on a freshly-rebuilt
 * dev backend lands within a few minutes.
 */
const USER_POLL_FALLBACK_INTERVAL_MS = 5 * 60_000;

export function SessionSyncProvider({ children }: ISessionSyncProviderProps): ReactNode {
    useAuthenticatedUserQuery();
    useAclVersionWatcher();
    useAclEventStream();
    useUserDataPollingFallback();

    return children;
}

function useAuthenticatedUserQuery(): void {
    const serverUrl = useServerStore((s) => s.serverUrl);
    const bootstrapped = useAuthStore((s) => s.bootstrapped);
    const accessToken = useAuthStore((s) => s.accessToken);

    const query = useQuery({
        queryKey: userDataQueryKey(serverUrl),
        queryFn: fetchCurrentUser,
        enabled: Boolean(serverUrl) && bootstrapped && Boolean(accessToken),
        staleTime: 60_000,
        retry: false,
    });

    useEffect(() => {
        if (query.data) {
            useAuthStore.getState().setUser(query.data);
        }
    }, [query.data]);
}

function useAclVersionWatcher(): void {
    const queryClient = useQueryClient();
    const user = useAuthStore((s) => s.user);
    const previousVersionRef = useRef<string | number | null | undefined>(undefined);
    const currentVersion = user?.acl_version ?? null;

    useEffect(() => {
        if (previousVersionRef.current === undefined) {
            previousVersionRef.current = currentVersion;
            return;
        }

        if (currentVersion !== previousVersionRef.current) {
            previousVersionRef.current = currentVersion;
            void queryClient.invalidateQueries({ queryKey: ['pages'] });
            void queryClient.invalidateQueries({ queryKey: ['page'] });
        }
    }, [currentVersion, queryClient]);
}

/**
 * Slow background poll for `user-data`. With the Mercure subscription
 * carrying the heavy lifting, this is just a fallback for the cases
 * where SSE can't connect (CORS-blocked dev preview, hub outage,
 * mobile networks that buffer long-lived connections).
 */
function useUserDataPollingFallback(): void {
    const queryClient = useQueryClient();
    const serverUrl = useServerStore((s) => s.serverUrl);
    const accessToken = useAuthStore((s) => s.accessToken);
    const bootstrapped = useAuthStore((s) => s.bootstrapped);

    useEffect(() => {
        if (!serverUrl || !accessToken || !bootstrapped) return undefined;

        const interval = setInterval(() => {
            void queryClient.invalidateQueries({ queryKey: userDataQueryKey(serverUrl) });
        }, USER_POLL_FALLBACK_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [accessToken, bootstrapped, queryClient, serverUrl]);
}
