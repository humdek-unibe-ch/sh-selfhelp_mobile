/**
 * Menu screen — renders the CMS `menu` page if it exists, otherwise
 * falls back to a generated list of accessible pages from the page list
 * endpoint. Reachable from the drawer and from in-page links.
 */

import { ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingScreen } from '@/components/feedback/LoadingScreen';
import { PageRenderer } from '@/components/renderer/PageRenderer';
import { PageList } from '@/components/shell/PageList';
import { usePageContent } from '@/hooks/usePageContent';

export default function MenuScreen(): React.ReactElement {
    const { t } = useTranslation();
    const { data, isLoading, error, refetch } = usePageContent('menu');

    if (isLoading) return <LoadingScreen message={t('loading')} />;

    // 404 / no `menu` keyword on this CMS instance → fall back to the
    // auto-generated nav list so the drawer entry is never a dead end.
    if (error || !data) {
        return (
            <SafeAreaView style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ padding: 16 }}>
                    <PageList />
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
