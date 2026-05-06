/**
 * Auth API helpers used by the auth-style components.
 */

import {
    CLIENT_TYPE_MOBILE,
    ENDPOINTS,
    HEADER_CLIENT_TYPE,
    type ILoginRequest,
    type ILoginSuccessResponse,
    type ITwoFactorRequiredResponse,
    type ITwoFactorVerifyRequest,
    type ITwoFactorVerifySuccessResponse,
} from '@selfhelp/shared';
import axios from 'axios';

import { useServerStore } from '@/stores/serverStore';
import { useAuthStore } from '@/stores/authStore';
import { secureStore } from '@/services/secureStore';
import { SECURE_STORE_KEYS } from '@/constants/secureStore';

export type TLoginResult =
    | { kind: 'ok' }
    | { kind: '2fa'; userId: number }
    | { kind: 'error'; message: string };

export async function login(payload: ILoginRequest): Promise<TLoginResult> {
    const baseURL = useServerStore.getState().serverUrl;
    if (!baseURL) return { kind: 'error', message: 'No backend selected' };
    try {
        const resp = await axios.post<ILoginSuccessResponse | ITwoFactorRequiredResponse>(
            `${baseURL}${ENDPOINTS.AUTH.LOGIN}`,
            payload,
            { headers: { [HEADER_CLIENT_TYPE]: CLIENT_TYPE_MOBILE } }
        );
        const data = resp.data.data;
        if (data && 'requires_2fa' in data && data.requires_2fa) {
            return { kind: '2fa', userId: data.user_id };
        }
        if (data && 'access_token' in data) {
            useAuthStore.getState().setSession(data.access_token, data.user);
            await secureStore.set(SECURE_STORE_KEYS.REFRESH_TOKEN, data.refresh_token);
            return { kind: 'ok' };
        }
        return { kind: 'error', message: resp.data.error ?? 'Unknown error' };
    } catch (e) {
        return { kind: 'error', message: (e as Error).message };
    }
}

export async function verifyTwoFactor(payload: ITwoFactorVerifyRequest): Promise<TLoginResult> {
    const baseURL = useServerStore.getState().serverUrl;
    if (!baseURL) return { kind: 'error', message: 'No backend selected' };
    try {
        const resp = await axios.post<ITwoFactorVerifySuccessResponse>(
            `${baseURL}${ENDPOINTS.AUTH.TWO_FACTOR_VERIFY}`,
            payload,
            { headers: { [HEADER_CLIENT_TYPE]: CLIENT_TYPE_MOBILE } }
        );
        const data = resp.data.data;
        if (data?.access_token) {
            useAuthStore.getState().setSession(data.access_token, data.user);
            await secureStore.set(SECURE_STORE_KEYS.REFRESH_TOKEN, data.refresh_token);
            return { kind: 'ok' };
        }
        return { kind: 'error', message: resp.data.error ?? 'Unknown error' };
    } catch (e) {
        return { kind: 'error', message: (e as Error).message };
    }
}

export async function logout(): Promise<void> {
    try {
        const baseURL = useServerStore.getState().serverUrl;
        const accessToken = useAuthStore.getState().accessToken;
        if (baseURL && accessToken) {
            await axios.post(`${baseURL}${ENDPOINTS.AUTH.LOGOUT}`, undefined, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    [HEADER_CLIENT_TYPE]: CLIENT_TYPE_MOBILE,
                },
            });
        }
    } catch {
        // Ignore — clearing local state is what matters.
    }
    await secureStore.remove(SECURE_STORE_KEYS.REFRESH_TOKEN);
    useAuthStore.getState().clear();
}
