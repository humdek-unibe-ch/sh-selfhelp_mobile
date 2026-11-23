/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Connects the access stamp of the API replies (`services/aclStamp.ts`) with the user data: a reply whose
 * stamp differs from `acl_stamp` of the user data makes the app read the user data again. The access
 * cascade (pages, menus, lists) then runs from `SessionSyncProvider`'s watcher, as for any access change.
 * This is the backstop for a push that was lost.
 */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { createAclStampWatcher, setAclStampWatcher } from '@/services/aclStamp';
import { userDataQueryKey } from '@/services/userService';
import { useAuthStore } from '@/stores/authStore';
import { useServerStore } from '@/stores/serverStore';

export function useAclStampWatcher(): void {
    const queryClient = useQueryClient();
    const serverUrl = useServerStore((s) => s.serverUrl);
    // A refreshed token of the same person keeps the watcher: only the sign-in state and the server count.
    const signedIn = useAuthStore((s) => Boolean(s.accessToken));

    useEffect(() => {
        if (!serverUrl || !signedIn) {
            return undefined;
        }

        const watcher = createAclStampWatcher({
            known: () => useAuthStore.getState().user?.acl_stamp,
            invalidate: () => {
                void queryClient.invalidateQueries({ queryKey: userDataQueryKey(serverUrl) });
            },
        });
        setAclStampWatcher(watcher);

        return () => {
            watcher.reset();
            setAclStampWatcher(null);
        };
    }, [serverUrl, signedIn, queryClient]);
}
