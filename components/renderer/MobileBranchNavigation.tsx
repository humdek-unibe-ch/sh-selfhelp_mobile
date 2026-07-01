/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import type { INavigationPayload } from '@selfhelp/shared';
import { pageUrlToMobileRoute, resolveMobileSegmentGroup } from '@selfhelp/shared';
import { useAppColors } from '@/hooks/useAppColors';
import { PageMenuIcon } from '@/components/shell/PageMenuIcon';

interface IMobileBranchNavigationProps {
    navigation: INavigationPayload | null | undefined;
    currentPageId: number;
}

export function MobileBranchNavigation({ navigation, currentPageId }: IMobileBranchNavigationProps): React.ReactElement | null {
    const pathname = usePathname();
    const colors = useAppColors();
    const segments = useMemo(
        () => (navigation ? resolveMobileSegmentGroup(navigation, currentPageId) : null),
        [navigation, currentPageId],
    );

    const initial = segments?.find((s) => s.pageId === currentPageId)?.keyword
        ?? segments?.[0]?.keyword
        ?? '';

    const [selectedKeyword, setSelectedKeyword] = useState(initial);
    const useFullWidth = (segments?.length ?? 0) <= 3;

    useEffect(() => {
        const fromUrl = segments?.find((segment) => {
            const href = pageUrlToMobileRoute(segment.url, segment.keyword);
            return pathname === href || pathname.endsWith(`/${segment.keyword}`);
        });
        if (fromUrl) {
            setSelectedKeyword(fromUrl.keyword);
            return;
        }
        setSelectedKeyword(segments?.[0]?.keyword ?? '');
    }, [pathname, segments]);

    if (!segments || segments.length === 0) {
        return null;
    }

    return (
        <ScrollView
            horizontal={!useFullWidth}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                gap: 8,
                ...(useFullWidth ? { flexGrow: 1, width: '100%' } : {}),
            }}
            style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
        >
            {segments.map((segment) => {
                const selected = segment.keyword === selectedKeyword || segment.pageId === currentPageId;
                const href = pageUrlToMobileRoute(segment.url, segment.keyword);
                return (
                    <Pressable
                        key={segment.pageId}
                        onPress={() => {
                            setSelectedKeyword(segment.keyword);
                            router.push(href as `/${string}`);
                        }}
                        style={{
                            flex: useFullWidth ? 1 : undefined,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            minHeight: 44,
                            minWidth: useFullWidth ? 0 : 96,
                            maxWidth: useFullWidth ? undefined : 220,
                            paddingVertical: 8,
                            paddingHorizontal: useFullWidth ? 10 : 14,
                            borderRadius: 999,
                            backgroundColor: selected ? colors.primary : colors.surfaceMuted,
                        }}
                    >
                        <PageMenuIcon
                            page={{
                                id: segment.pageId,
                                keyword: segment.keyword,
                                url: segment.url,
                                icon: segment.icon,
                                mobile_icon: segment.mobile_icon,
                                parent_page_id: null,
                                is_headless: false,
                            }}
                            size={16}
                            color={selected ? colors.onPrimary : colors.text}
                        />
                        <Text
                            numberOfLines={2}
                            style={{
                                flexShrink: 1,
                                color: selected ? colors.onPrimary : colors.text,
                                fontWeight: '600',
                                fontSize: 13,
                                textAlign: 'center',
                            }}
                        >
                            {segment.label}
                        </Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}
