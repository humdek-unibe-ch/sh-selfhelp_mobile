/**
 * Authenticated app shell — drawer-based per plan §7.
 *
 * Routes:
 *   - `index`   → home page (renders the CMS `home` keyword).
 *   - `menu`    → CMS-driven navigation menu.
 *   - `profile` → user profile / account.
 *   - `[keyword]` → catch-all for any CMS keyword route. Hidden from the
 *                   drawer so it can be linked to from any page or
 *                   pushed via `router.push('/<keyword>')`.
 *
 * `AppHeader` lives outside the drawer's own header so language
 * switcher and logout are reachable from every screen — this keeps the
 * drawer stripped down to navigation.
 */

import { Drawer } from 'expo-router/drawer';
import { DrawerActions } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View } from 'react-native';

import { AppHeader } from '@/components/shell/AppHeader';
import { BottomNavigationTabs } from '@/components/shell/BottomNavigationTabs';
import { CmsDrawerContent } from '@/components/shell/CmsDrawerContent';

export default function AppLayout(): React.ReactElement {
    const { t } = useTranslation();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
            <View style={{ flex: 1 }}>
                <Drawer
                    drawerContent={(props) => <CmsDrawerContent {...props} />}
                    screenOptions={({ navigation }) => ({
                        headerShown: true,
                        header: () => (
                            <AppHeader
                                onOpenDrawer={() => navigation.dispatch(DrawerActions.toggleDrawer())}
                            />
                        ),
                        drawerType: 'front',
                        drawerStyle: { backgroundColor: '#fff' },
                    })}
                >
                    <Drawer.Screen
                        name="index"
                        options={{
                            drawerLabel: t('drawer.home', 'Home'),
                            title: t('drawer.home', 'Home'),
                        }}
                    />
                    <Drawer.Screen
                        name="menu"
                        options={{
                            drawerLabel: t('drawer.menu', 'Menu'),
                            title: t('drawer.menu', 'Menu'),
                        }}
                    />
                    <Drawer.Screen
                        name="profile"
                        options={{
                            drawerLabel: t('drawer.profile', 'Profile'),
                            title: t('drawer.profile', 'Profile'),
                        }}
                    />
                    {/* Catch-all CMS keyword route is hidden from the drawer. */}
                    <Drawer.Screen
                        name="[keyword]"
                        options={{ drawerItemStyle: { display: 'none' } }}
                    />
                </Drawer>
                <BottomNavigationTabs />
            </View>
        </SafeAreaView>
    );
}
