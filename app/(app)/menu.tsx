/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Menu screen — renders the CMS `menu` page if it exists, otherwise
 * falls back to a generated list of accessible pages from the page list
 * endpoint. Reachable from the drawer and from in-page links.
 */

import { ScrollView } from 'react-native';
import { AxiosError } from 'axios';
import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingScreen } from '@/components/feedback/LoadingScreen';
import { PageRenderer } from '@/components/renderer/PageRenderer';
import { PageList } from '@/components/shell/PageList';
import { usePageContent } from '@/hooks/usePageContent';
import { useAuthStore } from '@/stores/authStore';

export default function MenuScreen(): React.ReactElement {
    const { t } = useTranslation();
    const { data, isLoading, error } = usePageContent('menu');
    const accessToken = useAuthStore((s) => s.accessToken);
    const shouldRedirectToLogin = !accessToken && isAuthError(error);
    const pathname = usePathname();
    const redirectedRef = useRef(false);

    useEffect(() => {
        if (!shouldRedirectToLogin) {
            redirectedRef.current = false;
            return;
        }
        if (pathname === '/login' || redirectedRef.current) return;

        redirectedRef.current = true;
        router.replace({
            pathname: '/(public)/login',
            params: { redirect: '/menu' },
        });
    }, [pathname, shouldRedirectToLogin]);

    if (isLoading) return <LoadingScreen message={t('loading')} />;
    if (shouldRedirectToLogin) return <LoadingScreen message={t('loading')} />;

    // 404 / no `menu` keyword on this CMS instance → fall back to the
    // auto-generated nav list so the drawer entry is never a dead end.
    if (error || !data) {
        return (
            <SafeAreaView style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ padding: 16 }}>
                    <PageList />
                </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <PageRenderer page={data} />
        </SafeAreaView>
    );
}

function isAuthError(error: Error | null): boolean {
    if (!(error instanceof AxiosError)) return false;
    const status = error.response?.status;
    return status === 401 || status === 403;
}
