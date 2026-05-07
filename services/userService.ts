import { ENDPOINTS, type IUserData, type IUserDataResponse } from '@selfhelp/shared';

import { getApiClient } from '@/services/apiClient';

export const userDataQueryKey = (serverUrl: string | null): readonly unknown[] =>
    ['user-data', serverUrl ?? 'no-server'] as const;

export async function fetchCurrentUser(): Promise<IUserData | null> {
    const resp = await getApiClient().get<IUserDataResponse>(ENDPOINTS.AUTH.USER_DATA);
    return resp.data.data ?? null;
}
