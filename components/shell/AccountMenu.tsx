/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Account sheet opened from the header avatar. Consolidates everything
 * that used to crowd the header into one clean bottom sheet:
 *
 *   - user identity (avatar + name + email)
 *   - appearance selector (light / dark / auto), mirroring the frontend
 *     `ThemeToggle`
 *   - language picker (`LanguageSwitcher`), mirroring the frontend
 *     `LanguageSelector`
 *   - "View profile" → opens the CMS profile page in a modal
 *   - dev-only "Switch server"
 *   - log in / log out
 *
 * All colours come from `useAppColors`, so the sheet follows the active
 * theme.
 */

import { useState, type ReactElement } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { runtimeConfig } from '@/config/runtime';
import { logout } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { useServerStore } from '@/stores/serverStore';
import { useThemeStore, type TThemeMode } from '@/stores/themeStore';
import { useAppColors, type IAppColors } from '@/hooks/useAppColors';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ProfileModal } from './ProfileModal';

interface IAccountMenuProps {
    visible: boolean;
    onClose: () => void;
}

const THEME_OPTIONS: readonly { mode: TThemeMode; labelKey: string; fallback: string; icon: string }[] = [
    { mode: 'light', labelKey: 'theme.light', fallback: 'Light', icon: '\u2600\uFE0F' },
    { mode: 'dark', labelKey: 'theme.dark', fallback: 'Dark', icon: '\u{1F319}' },
    { mode: 'auto', labelKey: 'theme.auto', fallback: 'Auto', icon: '\u{1F5A5}\uFE0F' },
];

export function AccountMenu({ visible, onClose }: IAccountMenuProps): ReactElement {
    const { t } = useTranslation();
    const colors = useAppColors();
    const user = useAuthStore((s) => s.user);
    const canSwitchServers = useServerStore((s) => s.canSwitchServers);
    const mode = useThemeStore((s) => s.mode);
    const setMode = useThemeStore((s) => s.setMode);
    const pathname = usePathname();
    const [profileOpen, setProfileOpen] = useState(false);

    const displayName =
        user?.name || user?.user_name || user?.email || t('account.guest', 'Guest');
    const initial = (displayName.charAt(0) || '?').toUpperCase();

    const onLogout = async (): Promise<void> => {
        onClose();
        await logout();
        router.replace({ pathname: '/(public)/login', params: { redirect: pathname } });
    };

    const onLogin = (): void => {
        onClose();
        router.push({ pathname: '/(public)/login', params: { redirect: pathname } });
    };

    const onSwitchServer = (): void => {
        onClose();
        router.push({ pathname: '/(dev)/server-picker', params: { redirect: pathname } });
    };

    return (
        <>
            <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
                <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                    <Pressable
                        style={[StyleSheet.absoluteFill, { backgroundColor: colors.backdrop }]}
                        onPress={onClose}
                        accessibilityRole="button"
                        accessibilityLabel={t('close', 'Close')}
                    />
                    <View
                        onStartShouldSetResponder={() => true}
                        style={{
                            backgroundColor: colors.surface,
                            borderTopLeftRadius: 18,
                            borderTopRightRadius: 18,
                            paddingTop: 8,
                            maxHeight: '85%',
                        }}
                    >
                        <View
                            style={{
                                alignSelf: 'center',
                                width: 36,
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: colors.border,
                                marginBottom: 4,
                            }}
                        />
                        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28, gap: 20 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <View
                                    style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 24,
                                        backgroundColor: colors.primary,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Text style={{ color: colors.onPrimary, fontSize: 20, fontWeight: '700' }}>
                                        {initial}
                                    </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text
                                        style={{ fontSize: 16, fontWeight: '700', color: colors.text }}
                                        numberOfLines={1}
                                    >
                                        {displayName}
                                    </Text>
                                    <Text style={{ fontSize: 13, color: colors.textFaint }} numberOfLines={1}>
                                        {user?.email ?? t('account.notSignedIn', 'Not signed in')}
                                    </Text>
                                </View>
                            </View>

                            <View style={{ gap: 8 }}>
                                <Text style={[styles.sectionLabel, { color: colors.textFaint }]}>
                                    {t('theme.title', 'Appearance')}
                                </Text>
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        backgroundColor: colors.surfaceMuted,
                                        borderRadius: 12,
                                        padding: 4,
                                        gap: 4,
                                    }}
                                >
                                    {THEME_OPTIONS.map((opt) => {
                                        const active = mode === opt.mode;
                                        return (
                                            <Pressable
                                                key={opt.mode}
                                                onPress={() => setMode(opt.mode)}
                                                accessibilityRole="button"
                                                accessibilityState={{ selected: active }}
                                                accessibilityLabel={t(opt.labelKey, opt.fallback)}
                                                style={{
                                                    flex: 1,
                                                    alignItems: 'center',
                                                    paddingVertical: 10,
                                                    borderRadius: 9,
                                                    backgroundColor: active ? colors.surface : 'transparent',
                                                    borderWidth: 1,
                                                    borderColor: active ? colors.border : 'transparent',
                                                }}
                                            >
                                                <Text style={{ fontSize: 18 }}>{opt.icon}</Text>
                                                <Text
                                                    style={{
                                                        fontSize: 12,
                                                        marginTop: 3,
                                                        fontWeight: active ? '700' : '500',
                                                        color: active ? colors.text : colors.textMuted,
                                                    }}
                                                >
                                                    {t(opt.labelKey, opt.fallback)}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>

                            <View style={{ gap: 8 }}>
                                <Text style={[styles.sectionLabel, { color: colors.textFaint }]}>
                                    {t('language.title', 'Language')}
                                </Text>
                                <LanguageSwitcher />
                            </View>

                            <View style={{ gap: 4 }}>
                                {user ? (
                                    <ActionRow
                                        icon={'\u{1F464}'}
                                        label={t('account.viewProfile', 'View profile')}
                                        onPress={() => setProfileOpen(true)}
                                        colors={colors}
                                    />
                                ) : null}
                                {canSwitchServers ? (
                                    <ActionRow
                                        icon={'\u{1F5A7}'}
                                        label={t('account.switchServer', 'Switch server')}
                                        onPress={onSwitchServer}
                                        colors={colors}
                                    />
                                ) : null}
                                {user ? (
                                    <ActionRow
                                        icon={'\u23FB'}
                                        label={t('logout', 'Log out')}
                                        onPress={() => void onLogout()}
                                        colors={colors}
                                        danger
                                    />
                                ) : (
                                    <ActionRow
                                        icon={'\u2192'}
                                        label={t('login', 'Log in')}
                                        onPress={onLogin}
                                        colors={colors}
                                    />
                                )}
                            </View>

                            {runtimeConfig.isDevInstance ? (
                                <Text style={{ fontSize: 11, color: colors.textFaint, textAlign: 'center' }}>
                                    {runtimeConfig.instanceSlug}
                                </Text>
                            ) : null}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
            <ProfileModal visible={profileOpen} onClose={() => setProfileOpen(false)} />
        </>
    );
}

interface IActionRowProps {
    icon: string;
    label: string;
    onPress: () => void;
    colors: IAppColors;
    danger?: boolean;
}

function ActionRow({ icon, label, onPress, colors, danger }: IActionRowProps): ReactElement {
    const tint = danger ? colors.danger : colors.text;
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: pressed ? colors.pressed : 'transparent',
            })}
        >
            <Text style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{icon}</Text>
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: tint }}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});
