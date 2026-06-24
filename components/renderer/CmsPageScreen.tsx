/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { router, usePathname } from 'expo-router';
import { AxiosError } from 'axios';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingScreen } from '@/components/feedback/LoadingScreen';
import { ErrorScreen } from '@/components/feedback/ErrorScreen';
import { usePageContent } from '@/hooks/usePageContent';
import { usePages } from '@/hooks/usePages';
import { useAppColors } from '@/hooks/useAppColors';
import { useAuthStore } from '@/stores/authStore';
import { findPageByKeyword } from '@/components/shell/navigationUtils';
import { PageRenderer } from './PageRenderer';
import { SegmentedChildPages } from './SegmentedChildPages';

interface ICmsPageScreenProps {
    keyword: string;
}

export function CmsPageScreen({ keyword }: ICmsPageScreenProps): React.ReactElement {
    const { t } = useTranslation();
    const colors = useAppColors();
    const { data: pages } = usePages();
    const navPage = pages ? findPageByKeyword(pages, keyword) : null;
    const hasChildren = Boolean(navPage?.children?.length);
    const { data, isLoading, error, refetch } = usePageContent(keyword);
    const accessToken = useAuthStore((s) => s.accessToken);
    const status = httpErrorStatus(error);
    // Anonymous 401/403 → bounce to login (the page needs a session). An
    // AUTHENTICATED 401/403/404 falls through to the matching in-place surface
    // below instead of redirecting.
    const shouldRedirectToLogin = !accessToken && (status === 401 || status === 403);
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
            params: { redirect: `/${keyword}` },
        });
    }, [keyword, pathname, shouldRedirectToLogin]);

    if (shouldRedirectToLogin) {
        return <LoadingScreen message={t('loading')} />;
    }

    if (hasChildren && navPage) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <SegmentedChildPages parent={navPage} />
            </SafeAreaView>
        );
    }

    if (isLoading) return <LoadingScreen message={t('loading')} />;
    if (error || !data) {
        // Map the backend status to the same states the web frontend shows, so a
        // missing / forbidden / unauthenticated page reads identically in the app
        // AND in both Live Preview panes (this screen also backs the modal host).
        if (status === 404) {
            return (
                <ErrorScreen
                    title={t('page.notFound.title', 'Page not found')}
                    message={t(
                        'page.notFound.message',
                        'The page you are looking for does not exist or has been moved.',
                    )}
                    actionLabel={t('page.backHome', 'Back to home')}
                    onAction={() => router.replace('/(app)/')}
                />
            );
        }
        if (status === 403) {
            return (
                <ErrorScreen
                    title={t('page.noAccess.title', 'Access denied')}
                    message={t(
                        'page.noAccess.message',
                        "You don't have permission to view this page.",
                    )}
                    actionLabel={t('page.backHome', 'Back to home')}
                    onAction={() => router.replace('/(app)/')}
                />
            );
        }
        if (status === 401) {
            return (
                <ErrorScreen
                    title={t('page.signInRequired.title', 'Sign in required')}
                    message={t('page.signInRequired.message', 'Please sign in to view this page.')}
                    actionLabel={t('auth.login', 'Login')}
                    onAction={() =>
                        router.replace({
                            pathname: '/(public)/login',
                            params: { redirect: `/${keyword}` },
                        })
                    }
                />
            );
        }
        // Network / 5xx / unknown → retryable generic error.
        return (
            <ErrorScreen
                title={t('error')}
                message={error?.message}
                onRetry={() => {
                    void refetch();
                }}
            />
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <PageRenderer page={data} />
        </SafeAreaView>
    );
}

/** HTTP status of a failed page fetch, or `null` for a non-HTTP (network) error. */
function httpErrorStatus(error: Error | null): number | null {
    if (!(error instanceof AxiosError)) return null;
    return error.response?.status ?? null;
}
