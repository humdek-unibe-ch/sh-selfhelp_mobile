/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Lightweight header rendered above each app screen. Hosts the
 * language switcher, a logout shortcut, and a hamburger button that
 * toggles the drawer in `(app)/_layout.tsx`. Designed to stay slim so it
 * doesn't compete with CMS-rendered content for screen real estate.
 */

import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';

import { useAuthStore } from '@/stores/authStore';
import { useServerStore } from '@/stores/serverStore';
import { logout } from '@/services/authService';
import { LanguageSwitcher } from './LanguageSwitcher';

interface IAppHeaderProps {
    onOpenDrawer: () => void;
}

export function AppHeader({ onOpenDrawer }: IAppHeaderProps): React.ReactElement {
    const user = useAuthStore((s) => s.user);
    const canSwitchServers = useServerStore((s) => s.canSwitchServers);
    const appName = Constants.expoConfig?.name ?? 'SelfHelp';

    const onLogout = async (): Promise<void> => {
        await logout();
        router.replace('/login');
    };

    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderColor: '#e9ecef',
                backgroundColor: '#fff',
            }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Pressable onPress={onOpenDrawer} accessibilityLabel="Open menu">
                    <Text style={{ fontSize: 22, fontWeight: '700' }}>{'\u2630'}</Text>
                </Pressable>
                <Pressable onPress={() => router.push('/')}>
                    <Text style={{ fontSize: 16, fontWeight: '700' }}>{appName}</Text>
                </Pressable>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <LanguageSwitcher compact />
                {canSwitchServers ? (
                    <Pressable onPress={() => router.push('/server-picker')}>
                        <Text style={{ color: '#228be6', marginLeft: 12, fontWeight: '600' }}>Server</Text>
                    </Pressable>
                ) : null}
                {user ? (
                    <Pressable onPress={() => void onLogout()}>
                        <Text style={{ color: '#fa5252', marginLeft: 12, fontWeight: '600' }}>Logout</Text>
                    </Pressable>
                ) : (
                    <Pressable onPress={() => router.push('/login')}>
                        <Text style={{ color: '#228be6', marginLeft: 12, fontWeight: '600' }}>Login</Text>
                    </Pressable>
                )}
            </View>
        </View>
    );
}
