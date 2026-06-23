/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Profile body shared by the `profile` drawer screen and the in-app
 * `ProfileModal`. Renders the CMS `profile` page when available, otherwise
 * a minimal themed account view with the current user info.
 */

import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LoadingScreen } from '@/components/feedback/LoadingScreen';
import { PageRenderer } from '@/components/renderer/PageRenderer';
import { usePageContent } from '@/hooks/usePageContent';
import { useAuthStore } from '@/stores/authStore';
import { useAppColors } from '@/hooks/useAppColors';
import { CommunicationPreferences } from '@/components/styles/auth/CommunicationPreferences';

export function ProfileContent(): React.ReactElement {
    const { t } = useTranslation();
    const user = useAuthStore((s) => s.user);
    const colors = useAppColors();
    const { data, isLoading, error } = usePageContent('profile');

    if (isLoading) return <LoadingScreen message={t('loading')} />;

    if (error || !data) {
        return (
            <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>
                    {t('profile.title', 'Profile')}
                </Text>
                <View style={{ gap: 4 }}>
                    <Text style={{ color: colors.text }}>
                        <Text style={{ fontWeight: '600' }}>{t('profile.username', 'Username')}: </Text>
                        {user?.user_name ?? user?.email ?? '—'}
                    </Text>
                    {user?.email ? (
                        <Text style={{ color: colors.text }}>
                            <Text style={{ fontWeight: '600' }}>{t('profile.email', 'Email')}: </Text>
                            {user.email}
                        </Text>
                    ) : null}
                </View>
                <CommunicationPreferences />
            </ScrollView>
        );
    }

    return <PageRenderer page={data} />;
}
