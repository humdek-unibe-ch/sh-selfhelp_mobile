/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Full-screen modal that presents the CMS `profile` page (via
 * `ProfileContent`) without leaving the current screen. Opened from the
 * account sheet (`AccountMenu`).
 */

import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useAppColors } from '@/hooks/useAppColors';
import { ProfileContent } from './ProfileContent';

interface IProfileModalProps {
    visible: boolean;
    onClose: () => void;
}

export function ProfileModal({ visible, onClose }: IProfileModalProps): React.ReactElement {
    const { t } = useTranslation();
    const colors = useAppColors();

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
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
                    <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>
                        {t('profile.title', 'Profile')}
                    </Text>
                    <Pressable
                        onPress={onClose}
                        accessibilityRole="button"
                        accessibilityLabel={t('close', 'Close')}
                        hitSlop={10}
                        style={({ pressed }) => ({
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: colors.surfaceMuted,
                            opacity: pressed ? 0.7 : 1,
                        })}
                    >
                        <Text style={{ fontSize: 20, lineHeight: 22, color: colors.textMuted }}>
                            {'\u00d7'}
                        </Text>
                    </Pressable>
                </View>
                <View style={{ flex: 1 }}>
                    <ProfileContent />
                </View>
            </SafeAreaView>
        </Modal>
    );
}
