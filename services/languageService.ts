/**
 * Language API helpers. Loads the public catalog of languages
 * and pushes the user's pick to `/auth/set-language` (which also
 * rotates the access token so the JWT carries the new locale).
 */

import {
    ENDPOINTS,
    type ILanguagePreference,
    type ILanguagePreferenceUpdateResponse,
    type ILanguagesResponse,
} from '@selfhelp/shared';

import { getApiClient } from '@/services/apiClient';
import { useAuthStore } from '@/stores/authStore';
import { useLanguageStore } from '@/stores/languageStore';

export async function fetchLanguages(): Promise<ILanguagePreference[]> {
    const resp = await getApiClient().get<ILanguagesResponse>(ENDPOINTS.LANGUAGES);
    return resp.data.data ?? [];
}

export async function setLanguage(languageId: number, locale: string): Promise<void> {
    try {
        const resp = await getApiClient().post<ILanguagePreferenceUpdateResponse>(
            ENDPOINTS.AUTH.SET_LANGUAGE,
            { language_id: languageId }
        );
        const data = resp.data.data;
        if (data?.access_token) {
            useAuthStore.getState().setAccessToken(data.access_token);
        }
    } catch {
        // Anonymous users don't have an auth context — language change still works locally.
    }
    useLanguageStore.getState().setLocale(locale, languageId);
}
