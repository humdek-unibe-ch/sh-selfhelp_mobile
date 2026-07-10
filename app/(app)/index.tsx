/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import { resolveMobileStartupKeyword, resolveMobileStartupRoute } from '@selfhelp/shared';

import { CmsPageScreen } from '@/components/renderer/CmsPageScreen';
import { useNavigation } from '@/hooks/useNavigation';
import { useAuthStore } from '@/stores/authStore';

/**
 * Cold-start hop: redirects to the menu-builder startup page instead of
 * hardcoding `home`.
 */
export default function HomeScreen(): React.ReactElement {
    const { data: navigation, isLoading } = useNavigation();
    const accessToken = useAuthStore((s) => s.accessToken);
    const isLoggedIn = Boolean(accessToken);

    const targetRoute = navigation
        ? resolveMobileStartupRoute(navigation.startup, isLoggedIn)
        : '/index';
    const startupKeyword = navigation
        ? resolveMobileStartupKeyword(navigation.startup, isLoggedIn)
        : 'home';

    useEffect(() => {
        if (!navigation || targetRoute === '/index') {
            return;
        }
        router.replace(targetRoute);
    }, [navigation, targetRoute]);

    if (isLoading || !navigation) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator />
            </View>
        );
    }

    if (targetRoute !== '/index') {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator />
            </View>
        );
    }

    return <CmsPageScreen keyword={startupKeyword} />;
}
