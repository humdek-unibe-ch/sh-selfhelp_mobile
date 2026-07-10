/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
'use client';

import { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams, usePathname } from 'expo-router';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    buildPublicPathFromRoute,
    pageUrlToMobileRoute,
    resolveHolderRedirectPath,
    resolveMobileSegmentGroup,
    findPageRefInNavigationPayload,
} from '@selfhelp/shared';

import { LoadingScreen } from '@/components/feedback/LoadingScreen';
import { ErrorScreen } from '@/components/feedback/ErrorScreen';
import { usePageContent } from '@/hooks/usePageContent';
import { usePages } from '@/hooks/usePages';
import { useAppColors } from '@/hooks/useAppColors';
import { useAuthStore } from '@/stores/authStore';
import { useNavigation } from '@/hooks/useNavigation';
import { recordLastVisited } from '@/services/navigationService';
import { findPageByKeyword } from '@/components/shell/navigationUtils';
import { PageRenderer } from './PageRenderer';
import { MobileBranchNavigation } from './MobileBranchNavigation';

interface ICmsPageScreenProps {
    keyword: string;
    /** When set, fetch page content via `GET /pages/resolve` (parameterized routes). */
    resolvePath?: string | null;
}

export function CmsPageScreen({ keyword, resolvePath: resolvePathProp }: ICmsPageScreenProps): React.ReactElement {
    const routeParams = useLocalSearchParams<Record<string, string>>();
    const { t } = useTranslation();
    const colors = useAppColors();
    const { data: pages } = usePages();
    const { data: navigation } = useNavigation();
    const navPage = pages ? findPageByKeyword(pages, keyword) : null;
    const navPageId = navPage?.id ?? navPage?.id_pages ?? 0;
    const resolvePath = useMemo(() => {
        if (resolvePathProp) {
            return resolvePathProp;
        }
        if (!navPage?.url) {
            return null;
        }
        return buildPublicPathFromRoute(navPage.url, routeParams);
    }, [navPage?.url, resolvePathProp, routeParams]);
    const { data, isLoading, error, refetch } = usePageContent(keyword, resolvePath);
    const accessToken = useAuthStore((s) => s.accessToken);
    const status = httpErrorStatus(error);
    const shouldRedirectToLogin = !accessToken && (status === 401 || status === 403);
    const pathname = usePathname();
    const redirectedRef = useRef(false);
    const holderRedirectRef = useRef(false);

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

    const resolvedPageId = data?.id ?? navPageId;

    useEffect(() => {
        if (!navigation || navPageId <= 0 || holderRedirectRef.current) {
            return;
        }
        const pageRef = findPageRefInNavigationPayload(navigation, navPageId);
        if (pageRef?.has_content !== false) {
            return;
        }
        const target = resolveHolderRedirectPath(navigation, navPageId, 'mobile', false);
        if (!target || target === pathname) {
            return;
        }
        holderRedirectRef.current = true;
        router.replace(target);
    }, [navigation, navPageId, pathname]);

    const pageHasSections = (data?.sections?.length ?? 0) > 0;

    useEffect(() => {
        if (!navigation || !data || isLoading || pageHasSections || holderRedirectRef.current) {
            return;
        }
        const target = resolveHolderRedirectPath(navigation, resolvedPageId, 'mobile', pageHasSections);
        if (!target || target === pathname) {
            return;
        }
        holderRedirectRef.current = true;
        router.replace(target);
    }, [navigation, data, isLoading, pageHasSections, resolvedPageId, pathname]);

    const lastVisitedRef = useRef<number | null>(null);
    useEffect(() => {
        if (!accessToken || !data || data.is_headless || resolvedPageId <= 0) {
            return;
        }
        if (lastVisitedRef.current === resolvedPageId) {
            return;
        }
        lastVisitedRef.current = resolvedPageId;
        void recordLastVisited({
            page_id: resolvedPageId,
            keyword: data.keyword ?? keyword,
            url: data.url ?? undefined,
            platform: 'mobile',
        }).catch(() => {
            lastVisitedRef.current = null;
        });
    }, [accessToken, data, keyword, resolvedPageId]);

    // Swipe left/right between the sibling pages of the branch tab strip.
    // The pan only activates on a mostly-horizontal drag (activeOffsetX) and
    // fails on vertical movement so page scrolling keeps working.
    const branchSegments = useMemo(
        () => (navigation && resolvedPageId > 0
            ? resolveMobileSegmentGroup(navigation, resolvedPageId)
            : null),
        [navigation, resolvedPageId],
    );

    const swipeGesture = useMemo(() => {
        const segments = branchSegments ?? [];
        const currentIndex = segments.findIndex((segment) => segment.pageId === resolvedPageId);
        return Gesture.Pan()
            .runOnJS(true)
            .enabled(segments.length > 1 && currentIndex >= 0)
            .activeOffsetX([-48, 48])
            .failOffsetY([-24, 24])
            .onEnd((event) => {
                if (currentIndex < 0) return;
                const goNext = event.translationX < -60 || event.velocityX < -800;
                const goPrev = event.translationX > 60 || event.velocityX > 800;
                const target = goNext
                    ? segments[currentIndex + 1]
                    : goPrev
                        ? segments[currentIndex - 1]
                        : null;
                if (target) {
                    router.push(pageUrlToMobileRoute(target.url, target.keyword));
                }
            });
    }, [branchSegments, resolvedPageId]);

    if (shouldRedirectToLogin) {
        return <LoadingScreen message={t('loading')} />;
    }

    const branchNav = navigation && resolvedPageId > 0 ? (
        <MobileBranchNavigation navigation={navigation} currentPageId={resolvedPageId} />
    ) : null;

    if (isLoading) return <LoadingScreen message={t('loading')} />;
    if (error || !data) {
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
            {branchNav}
            <GestureDetector gesture={swipeGesture}>
                <View style={{ flex: 1 }} collapsable={false}>
                    <PageRenderer page={data} />
                </View>
            </GestureDetector>
        </SafeAreaView>
    );
}

function httpErrorStatus(error: Error | null): number | null {
    if (!(error instanceof AxiosError)) return null;
    return error.response?.status ?? null;
}
