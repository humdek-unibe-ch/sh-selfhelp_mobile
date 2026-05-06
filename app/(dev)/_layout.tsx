/**
 * (dev) route group — present only in development / preview builds.
 *
 * Production builds bake the backend URL into the bundle and set
 * `canSwitchServers=false`, so the gate controller in the root
 * `_layout.tsx` never navigates here.
 *
 * Keeping the picker isolated under `(dev)` makes it trivial to:
 *   - Tree-shake out of prod bundles by build flag.
 *   - Find every dev-only screen in one folder.
 */

import { Redirect, Stack } from 'expo-router';

import { useServerStore } from '@/stores/serverStore';

export default function DevLayout(): React.ReactElement {
    const canSwitchServers = useServerStore((s) => s.canSwitchServers);

    // In production builds the picker route should not be reachable.
    // Redirect away to the public auth flow if a deep link tries.
    if (!canSwitchServers) {
        return <Redirect href="/(public)/login" />;
    }

    return <Stack screenOptions={{ headerShown: false }} />;
}
