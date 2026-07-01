/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Authenticated app shell — CMS drawer + optional bottom tabs.
 *
 * Routes:
 *   - `index`   → startup redirect hop (hidden from drawer chrome).
 *   - `profile` → system account route (outside CMS menu builder).
 *   - `[keyword]` → catch-all CMS pages.
 */

import { Drawer } from 'expo-router/drawer';
import { DrawerActions } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View } from 'react-native';

import { AppHeader } from '@/components/shell/AppHeader';
import { BottomNavigationTabs } from '@/components/shell/BottomNavigationTabs';
import { CmsDrawerContent } from '@/components/shell/CmsDrawerContent';
import { getBottomTabMenuItems, getDrawerMenuItems } from '@/components/shell/navigationUtils';
import { useAppColors } from '@/hooks/useAppColors';
import { useNavigation } from '@/hooks/useNavigation';

export default function AppLayout(): React.ReactElement {
    const { t } = useTranslation();
    const colors = useAppColors();
    const { data: navigation } = useNavigation();
    const showBottomTabs = getBottomTabMenuItems(navigation).length > 0;
    const showDrawer = getDrawerMenuItems(navigation).length > 0;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <Drawer
                    drawerContent={(props) => <CmsDrawerContent {...props} />}
                    screenOptions={({ navigation: nav }) => ({
                        headerShown: true,
                        header: () => (
                            <AppHeader
                                showDrawer={showDrawer}
                                onOpenDrawer={() => nav.dispatch(DrawerActions.toggleDrawer())}
                            />
                        ),
                        drawerType: 'front',
                        swipeEnabled: showDrawer,
                        drawerStyle: { backgroundColor: colors.surface, width: showDrawer ? undefined : 0 },
                    })}
                >
                    <Drawer.Screen
                        name="index"
                        options={{
                            drawerItemStyle: { display: 'none' },
                            title: t('drawer.home', 'Home'),
                        }}
                    />
                    <Drawer.Screen
                        name="profile"
                        options={{
                            drawerLabel: t('drawer.profile', 'Profile'),
                            title: t('drawer.profile', 'Profile'),
                        }}
                    />
                    <Drawer.Screen
                        name="[keyword]"
                        options={{ drawerItemStyle: { display: 'none' } }}
                    />
                </Drawer>
                {showBottomTabs ? <BottomNavigationTabs /> : null}
            </View>
        </SafeAreaView>
    );
}
