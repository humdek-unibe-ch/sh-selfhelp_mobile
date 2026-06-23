/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Login screen.
 *
 * The actual rendered content is the CMS `login` style, fetched by
 * keyword from the backend. This wrapper handles the "no page yet"
 * loading state and the auth redirect after a successful submit.
 */

import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View } from 'react-native';

import { LoadingScreen } from '@/components/feedback/LoadingScreen';
import { ErrorScreen } from '@/components/feedback/ErrorScreen';
import { PageRenderer } from '@/components/renderer/PageRenderer';
import { usePageContent } from '@/hooks/usePageContent';
import { useAppColors } from '@/hooks/useAppColors';

export default function LoginScreen(): React.ReactElement {
    const { t } = useTranslation();
    const colors = useAppColors();
    const { data, isLoading, error, refetch } = usePageContent('login');

    if (isLoading) return <LoadingScreen message={t('loading')} />;
    if (error || !data)
        return (
            <ErrorScreen
                title={t('error')}
                message={error?.message}
                onRetry={() => {
                    void refetch();
                }}
            />
        );

    // The public Stack scene defaults to React Navigation's white background, so
    // without an explicit theme colour the dark-mode login renders light text on
    // white. Paint the screen with the theme background like the (app) shell does.
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <PageRenderer page={data} />
            </View>
        </SafeAreaView>
    );
}
