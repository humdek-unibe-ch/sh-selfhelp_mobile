/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { IPageItem } from '@selfhelp/shared';
import { router, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { LoadingScreen } from '@/components/feedback/LoadingScreen';
import { ErrorScreen } from '@/components/feedback/ErrorScreen';
import { usePageContent } from '@/hooks/usePageContent';
import { getMenuTree, getPageLabel, isPageActive } from '@/components/shell/navigationUtils';
import { PageRenderer } from './PageRenderer';

interface ISegmentedChildPagesProps {
    parent: IPageItem;
}

/**
 * Renders the children of a parent CMS page as a horizontal segmented
 * tab strip with the selected child's content below.
 *
 * Active tab tracking:
 *
 *   - On mount we pick the child whose href matches the current URL
 *     pathname, so a deep-link / browser refresh to e.g.
 *     `/team/people` lands on the `people` tab — not the first one.
 *   - Tap selects locally so the user can swipe through tabs without a
 *     full route change. We also push the URL so the back button
 *     works and refresh remembers the choice.
 */
export function SegmentedChildPages({ parent }: ISegmentedChildPagesProps): React.ReactElement | null {
    const { t } = useTranslation();
    const pathname = usePathname();

    const children = parent.children ? getMenuTree(parent.children) : [];

    const initial = (() => {
        const fromUrl = children.find((child) => isPageActive(child, pathname));
        return fromUrl?.keyword ?? children[0]?.keyword ?? '';
    })();

    const [selectedKeyword, setSelectedKeyword] = useState<string>(initial);

    useEffect(() => {
        const fromUrl = children.find((child) => isPageActive(child, pathname));
        if (fromUrl) {
            setSelectedKeyword(fromUrl.keyword);
            return;
        }
        setSelectedKeyword(children[0]?.keyword ?? '');
        // children identity is stable per parent.keyword; we re-derive
        // selection whenever pathname OR the parent itself changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname, parent.keyword]);

    const { data, isLoading, error, refetch } = usePageContent(selectedKeyword);

    if (children.length === 0) return null;

    return (
        <View style={{ flex: 1 }}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
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
                            onPress={() => {
                                setSelectedKeyword(child.keyword);
                                router.push(`/${child.keyword}`);
                            }}
                            style={({ pressed }) => ({
                                paddingVertical: 8,
                                paddingHorizontal: 14,
                                borderRadius: 999,
                                backgroundColor: selected
                                    ? '#1c7ed6'
                                    : pressed
                                        ? '#dee2e6'
                                        : '#f1f3f5',
                            })}
                        >
                            <Text
                                style={{
                                    color: selected ? '#ffffff' : '#343a40',
                                    fontWeight: '600',
                                    fontSize: 13,
                                    letterSpacing: 0.2,
                                }}
                            >
                                {getPageLabel(child)}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>

            {isLoading && !data ? <LoadingScreen message={t('loading')} /> : null}
            {!isLoading && error ? (
                <ErrorScreen
                    title={t('error')}
                    message={error.message}
                    onRetry={() => {
                        void refetch();
                    }}
                />
            ) : null}
            {data ? <PageRenderer page={data} /> : null}
        </View>
    );
}
