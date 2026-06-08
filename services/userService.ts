/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { ENDPOINTS, type IUserData, type IUserDataResponse } from '@selfhelp/shared';

import { getApiClient } from '@/services/apiClient';

export const userDataQueryKey = (serverUrl: string | null): readonly unknown[] =>
    ['user-data', serverUrl ?? 'no-server'] as const;

export async function fetchCurrentUser(): Promise<IUserData | null> {
    const resp = await getApiClient().get<IUserDataResponse>(ENDPOINTS.AUTH.USER_DATA);
    return resp.data.data ?? null;
}

/**
 * Update the current user's communication preferences (issue #29).
 *
 * Persists whether the backend may send scheduled notifications and
 * (non-system) emails, and returns the refreshed user payload. The backend
 * delivery preference is independent of OS push permission.
 */
export async function updateCommunicationPreferences(
    receivesNotifications: boolean,
    receivesEmails: boolean
): Promise<IUserData | null> {
    const resp = await getApiClient().put<IUserDataResponse>(
        ENDPOINTS.USER.UPDATE_COMMUNICATION_PREFERENCES,
        {
            receives_notifications: receivesNotifications,
            receives_emails: receivesEmails,
        }
    );
    return resp.data.data ?? null;
}
