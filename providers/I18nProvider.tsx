/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * i18next bootstrap with `expo-localization` for device defaults and
 * `expo-secure-store` to remember the user's choice.
 *
 * Locale changes invalidate every TanStack Query so page content
 * refetches with the new language.
 */

import { useEffect, type ReactNode } from 'react';
import * as Localization from 'expo-localization';
import { initReactI18next } from 'react-i18next';
import i18n from 'i18next';
import { useQueryClient } from '@tanstack/react-query';

import { secureStore } from '@/services/secureStore';
import { SECURE_STORE_KEYS } from '@/constants/secureStore';
import { getWebPreviewRuntime } from '@/config/webPreview';
import { resolveInitialLocale } from '@/services/previewPreferenceSync';
import { useLanguageStore } from '@/stores/languageStore';

const resources = {
    en: {
        common: {
            loading: 'Loading…',
            error: 'Something went wrong',
            retry: 'Retry',
            login: 'Log in',
            logout: 'Log out',
            register: 'Register',
            email: 'Email',
            password: 'Password',
            close: 'Close',
            theme: {
                title: 'Appearance',
                light: 'Light',
                dark: 'Dark',
                auto: 'Auto',
            },
            language: {
                title: 'Language',
            },
            account: {
                guest: 'Guest',
                notSignedIn: 'Not signed in',
                viewProfile: 'View profile',
                switchServer: 'Switch server',
            },
            profile: {
                title: 'Profile',
                username: 'Username',
                email: 'Email',
            },
        },
    },
} as const;

if (!i18n.isInitialized) {
    void i18n
        .use(initReactI18next)
        .init({
            resources,
            lng: 'en',
            fallbackLng: 'en',
            defaultNS: 'common',
            ns: ['common'],
            interpolation: { escapeValue: false },
            returnNull: false,
        });
}

interface II18nProviderProps {
    children: ReactNode;
}

export function I18nProvider({ children }: II18nProviderProps): ReactNode {
    const queryClient = useQueryClient();

    useEffect(() => {
        let cancelled = false;

        const initialise = async (): Promise<void> => {
            // In the CMS Live Preview the hosting shell pins the language through the
            // embed URL (`language=<locale>`). Booting straight into that locale means
            // the mobile frame already matches the web pane, so the shell's initial
            // SET_PREFERENCES push is a no-op: no post-boot `setLanguage` (which rotates
            // the token AND invalidates every query) and no locale mismatch to reconcile.
            // That mismatch — mobile on the device locale, shell on a CMS locale — was
            // what made the two panes thrash with a query-invalidation storm.
            const preview = getWebPreviewRuntime();
            const previewLocale = preview.enabled ? (preview.params.language ?? null) : null;
            const stored = await secureStore.get(SECURE_STORE_KEYS.LANGUAGE_LOCALE);
            const detected = Localization.getLocales()[0]?.languageTag ?? 'en';
            const locale = resolveInitialLocale(previewLocale, stored, detected);
            if (cancelled) return;
            (globalThis as { __sh_locale?: string }).__sh_locale = locale;
            await i18n.changeLanguage(locale);
            useLanguageStore.getState().setLocale(locale, null);
        };

        void initialise();

        const unsubscribe = useLanguageStore.subscribe((state, prev) => {
            if (state.locale === prev.locale) return;
            if (!state.locale) return;
            (globalThis as { __sh_locale?: string }).__sh_locale = state.locale;
            void secureStore.set(SECURE_STORE_KEYS.LANGUAGE_LOCALE, state.locale);
            void i18n.changeLanguage(state.locale);
            void queryClient.invalidateQueries();
        });

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, [queryClient]);

    return children;
}
