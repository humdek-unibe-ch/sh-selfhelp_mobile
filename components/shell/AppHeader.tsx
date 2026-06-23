/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Slim header above every app screen: a hamburger that toggles the drawer
 * and the app name on the left, and a single account button on the right.
 *
 * The account button opens `AccountMenu` — a bottom sheet that holds the
 * theme selector, language picker, profile, server switch and log in/out.
 * Keeping everything behind one avatar keeps the header uncluttered and
 * lets it adapt to the active colour scheme.
 */

import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';

import { useAuthStore } from '@/stores/authStore';
import { useAppColors } from '@/hooks/useAppColors';
import { AccountMenu } from './AccountMenu';

interface IAppHeaderProps {
    onOpenDrawer: () => void;
}

export function AppHeader({ onOpenDrawer }: IAppHeaderProps): React.ReactElement {
    const user = useAuthStore((s) => s.user);
    const colors = useAppColors();
    const appName = Constants.expoConfig?.name ?? 'SelfHelp';
    const [menuOpen, setMenuOpen] = useState(false);

    const displayName = user?.name || user?.user_name || user?.email || '';
    const initial = displayName ? displayName.charAt(0).toUpperCase() : null;

    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
            }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Pressable
                    onPress={onOpenDrawer}
                    accessibilityRole="button"
                    accessibilityLabel="Open menu"
                    hitSlop={8}
                >
                    <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{'\u2630'}</Text>
                </Pressable>
                <Pressable onPress={() => router.push('/')} accessibilityRole="button" accessibilityLabel={appName}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{appName}</Text>
                </Pressable>
            </View>

            <Pressable
                onPress={() => setMenuOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={user ? 'Account menu' : 'Settings and sign in'}
                hitSlop={8}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
                {initial ? (
                    <View
                        style={{
                            width: 34,
                            height: 34,
                            borderRadius: 17,
                            backgroundColor: colors.primary,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Text style={{ color: colors.onPrimary, fontWeight: '700', fontSize: 15 }}>{initial}</Text>
                    </View>
                ) : (
                    <View
                        style={{
                            width: 34,
                            height: 34,
                            borderRadius: 17,
                            backgroundColor: colors.surfaceMuted,
                            borderWidth: 1,
                            borderColor: colors.border,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Text style={{ fontSize: 16, color: colors.textMuted }}>{'\u2699'}</Text>
                    </View>
                )}
            </Pressable>

            <AccountMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
        </View>
    );
}
