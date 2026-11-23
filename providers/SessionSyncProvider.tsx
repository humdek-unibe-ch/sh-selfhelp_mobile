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
 *   2. Watches `user.acl_version` and `user.acl_stamp` and invalidates the
 *      page list, pages, menus and lists whenever either changes. Same
 *      pattern as the web frontend's `useAclVersionWatcher`; the stamp also
 *      covers a change of a group or role of the person.
 *   3. Subscribes to the backend's Mercure live-sync stream via
 *      `useAclEventStream` (guests too). A `changed` message with the tag
 *      `acl` invalidates user-data, the watcher above sees the bumped
 *      version or stamp, and page/menu caches refresh without any user
 *      interaction; other tags read the pages, menus and lists that depend
 *      on them. A reply whose `X-Acl-Stamp` differs from the user data's
 *      `acl_stamp` does the same (`useAclStampWatcher`): the backstop for a
 *      lost message.
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
import { useAclStampWatcher } from '@/hooks/useAclStampWatcher';
import { invalidateAccessQueries } from '@/services/syncApply';
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
    useAclStampWatcher();
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
    const previousVersionRef = useRef<string | null | undefined>(undefined);
    // One fingerprint of everything that decides what the person sees: their own version and the access stamp
    // (their groups' and roles' versions, which move without touching the person's own `acl_version`).
    const currentVersion = user ? `${user.acl_version ?? ''}|${user.acl_stamp ?? ''}` : null;

    useEffect(() => {
        if (previousVersionRef.current === undefined) {
            previousVersionRef.current = currentVersion;
            return;
        }

        if (currentVersion !== previousVersionRef.current) {
            previousVersionRef.current = currentVersion;
            // Pages, the page list, the menus (F251) and the lists: what the person sees depends on their access.
            invalidateAccessQueries(queryClient);
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
