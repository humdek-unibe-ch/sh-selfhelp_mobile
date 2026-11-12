/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Durable auth session snapshot.
 *
 * Access tokens stay short-lived and are only restored while their JWT
 * `exp` is still comfortably valid. Refresh tokens remain the long-lived
 * recovery credential and are used only when the access token is missing,
 * expired, or rejected by the backend.
 */

import type { IUserData } from '@selfhelp/shared';

import { SECURE_STORE_KEYS } from '@/constants/secureStore';
import { ACCESS_TOKEN_EXPIRY_SKEW_MS, getAccessTokenExpiresAt } from '@/services/accessTokenExpiry';
import { debugLogger } from '@/services/debugLogger';
import { secureStore } from '@/services/secureStore';

export interface IPersistedAuthSession {
    accessToken: string;
    accessTokenExpiresAt: number;
    serverUrl: string;
    user: IUserData;
    savedAt: number;
}

export interface IAuthSessionCommit {
    accessToken: string;
    refreshToken?: string | null;
    serverUrl: string;
    user: IUserData;
}

export async function persistRefreshToken(refreshToken: string): Promise<void> {
    await secureStore.set(SECURE_STORE_KEYS.REFRESH_TOKEN, refreshToken);
}

export async function persistAuthSession(commit: IAuthSessionCommit): Promise<void> {
    if (commit.refreshToken) {
        await persistRefreshToken(commit.refreshToken);
    }

    const accessTokenExpiresAt = getAccessTokenExpiresAt(commit.accessToken);
    if (!accessTokenExpiresAt) {
        debugLogger.warn('session not persisted — access token has no exp claim', 'authSession');
        return;
    }

    const snapshot: IPersistedAuthSession = {
        accessToken: commit.accessToken,
        accessTokenExpiresAt,
        serverUrl: commit.serverUrl,
        user: commit.user,
        savedAt: Date.now(),
    };

    await secureStore.set(SECURE_STORE_KEYS.AUTH_SESSION, JSON.stringify(snapshot));
    debugLogger.info(
        `session persisted until ${new Date(accessTokenExpiresAt).toISOString()}`,
        'authSession'
    );
}

export async function loadPersistedAuthSession(serverUrl: string): Promise<IPersistedAuthSession | null> {
    const raw = await secureStore.get(SECURE_STORE_KEYS.AUTH_SESSION).catch(() => null);
    if (!raw) return null;

    let snapshot: IPersistedAuthSession;
    try {
        snapshot = JSON.parse(raw) as IPersistedAuthSession;
    } catch {
        await clearPersistedAuthSession();
        return null;
    }

    if (!isPersistedSessionShape(snapshot)) {
        await clearPersistedAuthSession();
        return null;
    }

    if (snapshot.serverUrl !== serverUrl) {
        debugLogger.info('session ignored — stored for another server', 'authSession');
        return null;
    }

    const expiresAt = getAccessTokenExpiresAt(snapshot.accessToken) ?? snapshot.accessTokenExpiresAt;
    if (expiresAt <= Date.now() + ACCESS_TOKEN_EXPIRY_SKEW_MS) {
        debugLogger.info('session expired — falling back to refresh token', 'authSession');
        await clearPersistedAuthSession();
        return null;
    }

    return { ...snapshot, accessTokenExpiresAt: expiresAt };
}

export async function clearPersistedAuthSession(): Promise<void> {
    await secureStore.remove(SECURE_STORE_KEYS.AUTH_SESSION);
}

function isPersistedSessionShape(value: unknown): value is IPersistedAuthSession {
    const record = value as Partial<IPersistedAuthSession> | null;
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof record?.accessToken === 'string' &&
        typeof record.accessTokenExpiresAt === 'number' &&
        typeof record.serverUrl === 'string' &&
        typeof record.savedAt === 'number' &&
        typeof record.user === 'object' &&
        record.user !== null
    );
}
