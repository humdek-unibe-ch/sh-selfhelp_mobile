/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Profile screen — renders the CMS `profile` page if available;
 * otherwise displays a minimal account view with the current user info.
 */

import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingScreen } from '@/components/feedback/LoadingScreen';
import { PageRenderer } from '@/components/renderer/PageRenderer';
import { usePageContent } from '@/hooks/usePageContent';
import { useAuthStore } from '@/stores/authStore';

export default function ProfileScreen(): React.ReactElement {
    const { t } = useTranslation();
    const user = useAuthStore((s) => s.user);
    const { data, isLoading, error } = usePageContent('profile');

    if (isLoading) return <LoadingScreen message={t('loading')} />;

    if (error || !data) {
        return (
            <SafeAreaView style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
                    <Text style={{ fontSize: 18, fontWeight: '600' }}>
                        {t('profile.title', 'Profile')}
                    </Text>
                    <View style={{ gap: 4 }}>
                        <Text>
                            <Text style={{ fontWeight: '600' }}>{t('profile.username', 'Username')}: </Text>
                            {user?.user_name ?? user?.email ?? '—'}
                        </Text>
                        {user?.email ? (
                            <Text>
                                <Text style={{ fontWeight: '600' }}>{t('profile.email', 'Email')}: </Text>
                                {user.email}
                            </Text>
                        ) : null}
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <PageRenderer page={data} />
        </SafeAreaView>
    );
}
