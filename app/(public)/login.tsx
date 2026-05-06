/**
 * Login screen.
 *
 * The actual rendered content is the CMS `login` style, fetched by
 * keyword from the backend. This wrapper handles the "no page yet"
 * loading state and the auth redirect after a successful submit.
 */

import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View } from 'react-native';

import { LoadingScreen } from '@/components/feedback/LoadingScreen';
import { ErrorScreen } from '@/components/feedback/ErrorScreen';
import { PageRenderer } from '@/components/renderer/PageRenderer';
import { usePageContent } from '@/hooks/usePageContent';

export default function LoginScreen(): React.ReactElement {
    const { t } = useTranslation();
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

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <View style={{ flex: 1 }}>
                <PageRenderer page={data} />
            </View>
        </SafeAreaView>
    );
}
