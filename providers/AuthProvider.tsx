/**
 * Bootstraps auth state on app launch / browser reload.
 *
 * Boot order is strict:
 *
 *   1. Wait for `useServerStore.hydrated` so we have a base URL and
 *      know whether the user can switch servers (dev/preview).
 *   2. Read the persisted refresh token (`SECURE_STORE_KEYS.REFRESH_TOKEN`,
 *      backed by `expo-secure-store` on native and `localStorage` on
 *      web preview) and exchange it for a fresh access token through
 *      the shared `refreshAccessToken()` singleton.
 *   3. Hydrate the user data (`/auth/user-data`) so the rest of the
 *      app can render with permissions / menu filtered correctly.
 *   4. Mark `bootstrapped = true` so the router/Stack mounts and the
 *      gated CMS queries (`pages`, `page`) are allowed to fire.
 *
 * The bootstrap promise is **module-scoped**, so React StrictMode
 * double-invocation, parent re-mounts, and Fast Refresh in dev all
 * join the same in-flight call. Without this guard, the second mount
 * would burn the (already rotated) refresh token, the backend would
 * reject it, and `clearAuthSession()` would wipe the credential —
 * exactly the "login lost on reload" symptom we used to see.
 *
 * Failure handling:
 *
 *   - Phase 1 (refresh): credential rejection (400 / 401 / 403) is
 *     handled inside `refreshAccessToken()`, which clears the auth
 *     session. Network/timeout failures keep the refresh token so the
 *     next launch can recover.
 *   - Phase 2 (user-data): never clears tokens. Any 401 there will
 *     trigger the normal apiClient interceptor on the next request.
 *
 * A hard ceiling timer guarantees `bootstrapped = true` within
 * `BOOTSTRAP_HARD_CEILING_MS` even if the network silently hangs, so
 * the splash never strands the UI.
 */

import { useEffect, type ReactNode } from 'react';

import { debugLogger } from '@/services/debugLogger';
import { appQueryClient } from '@/services/queryClient';
import { refreshAccessToken } from '@/services/tokenRefreshService';
import { fetchCurrentUser, userDataQueryKey } from '@/services/userService';
import { useAuthStore } from '@/stores/authStore';
import { useServerStore } from '@/stores/serverStore';

interface IAuthProviderProps {
    children: ReactNode;
}

const BOOTSTRAP_HARD_CEILING_MS = 12_000;

/**
 * Module-scoped guards. Once `bootstrapStarted = true` no other React
 * mount can re-enter the bootstrap, even when the parent re-renders
 * or StrictMode double-invokes the provider's effect. `ceilingTimer`
 * is module-scoped for the same reason: a single timer for the
 * lifetime of the app.
 */
let bootstrapPromise: Promise<void> | null = null;
let ceilingScheduled = false;

function markBootstrapped(reason: string): void {
    if (useAuthStore.getState().bootstrapped) return;
    debugLogger.info(`bootstrapped (${reason})`, 'AuthProvider');
    useAuthStore.getState().setBootstrapped(true);
}

function ensureCeiling(): void {
    if (ceilingScheduled) return;
    ceilingScheduled = true;
    setTimeout(() => {
        if (useAuthStore.getState().bootstrapped) return;
        debugLogger.warn(
            `bootstrap hit ${BOOTSTRAP_HARD_CEILING_MS}ms ceiling — releasing splash`,
            'AuthProvider'
        );
        markBootstrapped('ceiling');
    }, BOOTSTRAP_HARD_CEILING_MS);
}

async function runBootstrap(baseURL: string): Promise<void> {
    debugLogger.info(`bootstrap start (${baseURL})`, 'AuthProvider');

    // Phase 1 — refresh. The shared singleton:
    //   - reads the refresh token from secure storage,
    //   - calls `/auth/refresh-token` with a 7s timeout,
    //   - persists the rotated refresh token,
    //   - sets the access token in the auth store,
    //   - on 400/401/403 clears the auth session,
    //   - on network/5xx returns null but leaves the token in place.
    const accessToken = await refreshAccessToken();
    if (!accessToken) {
        debugLogger.warn('bootstrap refresh returned no access token', 'AuthProvider');
        markBootstrapped('refresh-failed');
        return;
    }
    debugLogger.info('bootstrap refresh ok — fetching user-data', 'AuthProvider');

    // Phase 2 — user-data. Best-effort. A failure here MUST NOT clear
    // the access token: it's freshly minted and any later 401 from a
    // real CMS request will be handled by the apiClient interceptor.
    try {
        const user = await fetchCurrentUser();
        if (user) {
            useAuthStore.getState().setUser(user);
            appQueryClient.setQueryData(userDataQueryKey(baseURL), user);
            debugLogger.info('bootstrap user-data ok', 'AuthProvider');
        }
    } catch (e) {
        debugLogger.warn(
            `bootstrap user-data failed: ${(e as Error).message} (keeping access token)`,
            'AuthProvider'
        );
    } finally {
        markBootstrapped('refresh-ok');
    }
}

/** The URL we last bootstrapped against, so dev server switches re-run bootstrap. */
let bootstrapBaseURL: string | null = null;

function startBootstrapOnce(baseURL: string | null): void {
    // If we already finished a bootstrap for this exact server, don't
    // run another one. But if the user just switched server, fall
    // through and start a fresh bootstrap (the picker has already
    // cleared the auth store + queries via `clearAuthSession()`).
    if (bootstrapPromise && bootstrapBaseURL === baseURL) return;

    bootstrapBaseURL = baseURL;

    if (!baseURL) {
        // No server selected (dev/preview before picker). Mark the
        // splash as done so the gate controller can route to the
        // picker instead of stranding the UI.
        bootstrapPromise = Promise.resolve();
        markBootstrapped('no-server');
        return;
    }

    // Server switched while running — make sure the gate routes to
    // the splash again until the new bootstrap commits.
    if (useAuthStore.getState().bootstrapped) {
        useAuthStore.getState().setBootstrapped(false);
    }

    bootstrapPromise = runBootstrap(baseURL).catch((e) => {
        debugLogger.error(`bootstrap unexpected error: ${(e as Error).message}`, 'AuthProvider');
        markBootstrapped('error');
    });
}

export function AuthProvider({ children }: IAuthProviderProps): ReactNode {
    // Use Zustand selectors so the effect re-fires whenever the values
    // change AND survives parent remounts (e.g. PersistQueryClient's
    // suspense fallback). A previous version subscribed inside an
    // empty-deps `useEffect`, but if AuthProvider was remounted while
    // ServerProvider's async hydration was still in flight, the
    // subscriber was torn down before the `setHydrated(true)` event
    // fired and the bootstrap never started.
    const hydrated = useServerStore((s) => s.hydrated);
    const serverUrl = useServerStore((s) => s.serverUrl);

    useEffect(() => {
        ensureCeiling();
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        startBootstrapOnce(serverUrl);
    }, [hydrated, serverUrl]);

    return children;
}

/** Test-only: reset module-level guards between unit tests. */
export function _resetAuthBootstrapGuards(): void {
    bootstrapPromise = null;
    bootstrapBaseURL = null;
    ceilingScheduled = false;
}
