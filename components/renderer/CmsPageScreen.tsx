import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingScreen } from '@/components/feedback/LoadingScreen';
import { ErrorScreen } from '@/components/feedback/ErrorScreen';
import { usePageContent } from '@/hooks/usePageContent';
import { usePages } from '@/hooks/usePages';
import { findPageByKeyword } from '@/components/shell/navigationUtils';
import { PageRenderer } from './PageRenderer';
import { SegmentedChildPages } from './SegmentedChildPages';

interface ICmsPageScreenProps {
    keyword: string;
}

export function CmsPageScreen({ keyword }: ICmsPageScreenProps): React.ReactElement {
    const { t } = useTranslation();
    const { data: pages } = usePages();
    const navPage = pages ? findPageByKeyword(pages, keyword) : null;
    const hasChildren = Boolean(navPage?.children?.length);
    const { data, isLoading, error, refetch } = usePageContent(keyword);

    if (hasChildren && navPage) {
        return (
            <SafeAreaView style={{ flex: 1 }}>
                <SegmentedChildPages parent={navPage} />
            </SafeAreaView>
        );
    }

    if (isLoading) return <LoadingScreen message={t('loading')} />;
    if (error || !data) {
        return (
            <ErrorScreen
                title={t('error')}
                message={error?.message}
                onRetry={() => {
                    void refetch();
                }}
                actionLabel={t('auth.login', 'Login')}
                onAction={() => router.push('/login')}
            />
        );
    }

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <PageRenderer page={data} />
        </SafeAreaView>
    );
}
