import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { IPageItem } from '@selfhelp/shared';
import { useTranslation } from 'react-i18next';

import { LoadingScreen } from '@/components/feedback/LoadingScreen';
import { ErrorScreen } from '@/components/feedback/ErrorScreen';
import { usePageContent } from '@/hooks/usePageContent';
import { getPageLabel } from '@/components/shell/navigationUtils';
import { PageRenderer } from './PageRenderer';

interface ISegmentedChildPagesProps {
    parent: IPageItem;
}

export function SegmentedChildPages({ parent }: ISegmentedChildPagesProps): React.ReactElement | null {
    const { t } = useTranslation();
    const children = parent.children ?? [];
    const [selectedKeyword, setSelectedKeyword] = useState(children[0]?.keyword ?? '');
    const { data, isLoading, error, refetch } = usePageContent(selectedKeyword);

    useEffect(() => {
        setSelectedKeyword(children[0]?.keyword ?? '');
    }, [children, parent.keyword]);

    if (children.length === 0) return null;

    return (
        <View style={{ flex: 1 }}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    gap: 8,
                    borderBottomWidth: 1,
                    borderColor: '#e9ecef',
                }}
            >
                {children.map((child) => {
                    const selected = child.keyword === selectedKeyword;
                    return (
                        <Pressable
                            key={child.id ?? child.keyword}
                            onPress={() => setSelectedKeyword(child.keyword)}
                            style={{
                                paddingVertical: 8,
                                paddingHorizontal: 12,
                                borderRadius: 999,
                                backgroundColor: selected ? '#228be6' : '#f1f3f5',
                            }}
                        >
                            <Text style={{ color: selected ? '#fff' : '#343a40', fontWeight: '600' }}>
                                {getPageLabel(child)}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>

            {isLoading ? <LoadingScreen message={t('loading')} /> : null}
            {error || !data ? (
                <ErrorScreen
                    title={t('error')}
                    message={error?.message}
                    onRetry={() => {
                        void refetch();
                    }}
                />
            ) : null}
            {data ? <PageRenderer page={data} /> : null}
        </View>
    );
}
