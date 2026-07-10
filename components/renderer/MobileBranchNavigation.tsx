/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { INavigationPayload } from '@selfhelp/shared';
import { pageUrlToMobileRoute, resolveMobileSegmentGroup } from '@selfhelp/shared';
import { useAppColors } from '@/hooks/useAppColors';
import { PageMenuIcon } from '@/components/shell/PageMenuIcon';

interface IMobileBranchNavigationProps {
    navigation: INavigationPayload | null | undefined;
    currentPageId: number;
}

/**
 * Top tab strip for nested pages — horizontal underline tabs (not stacked
 * pills). Few tabs share the row width evenly; many tabs become a horizontal
 * scroll strip and the active tab auto-scrolls into view.
 */
export function MobileBranchNavigation({ navigation, currentPageId }: IMobileBranchNavigationProps): React.ReactElement | null {
    const pathname = usePathname();
    const colors = useAppColors();
    // The app shell only applies the top safe-area edge; in landscape (or on
    // devices with side notches) the horizontal insets land on this bar, so it
    // pads them itself to keep the first/last tab fully tappable.
    const insets = useSafeAreaInsets();
    const { width: windowWidth } = useWindowDimensions();
    const segments = useMemo(
        () => (navigation ? resolveMobileSegmentGroup(navigation, currentPageId) : null),
        [navigation, currentPageId],
    );

    const initial = segments?.find((s) => s.pageId === currentPageId)?.keyword
        ?? segments?.[0]?.keyword
        ?? '';

    const [selectedKeyword, setSelectedKeyword] = useState(initial);
    // Up to 4 tabs share the row; beyond that the strip scrolls horizontally.
    const useFullWidth = (segments?.length ?? 0) <= 4;

    const scrollRef = useRef<ScrollView | null>(null);
    const tabLayoutsRef = useRef<Map<string, { x: number; width: number }>>(new Map());

    const scrollActiveIntoView = useCallback((keyword: string) => {
        if (useFullWidth) return;
        const layout = tabLayoutsRef.current.get(keyword);
        if (!layout || !scrollRef.current) return;
        // Center the active tab in the viewport when possible.
        const target = Math.max(0, layout.x - (windowWidth - layout.width) / 2);
        scrollRef.current.scrollTo({ x: target, animated: true });
    }, [useFullWidth, windowWidth]);

    useEffect(() => {
        const fromUrl = segments?.find((segment) => {
            const href = pageUrlToMobileRoute(segment.url, segment.keyword);
            return pathname === href || pathname.endsWith(`/${segment.keyword}`);
        });
        const next = fromUrl?.keyword ?? segments?.[0]?.keyword ?? '';
        setSelectedKeyword(next);
        if (next) {
            // Wait one frame so onLayout data exists on first render.
            requestAnimationFrame(() => scrollActiveIntoView(next));
        }
    }, [pathname, segments, scrollActiveIntoView]);

    if (!segments || segments.length === 0) {
        return null;
    }

    return (
        <ScrollView
            ref={scrollRef}
            horizontal
            scrollEnabled={!useFullWidth}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
                paddingLeft: insets.left,
                paddingRight: insets.right,
                ...(useFullWidth ? { flexGrow: 1, width: '100%' } : {}),
            }}
            style={{
                flexGrow: 0,
                backgroundColor: colors.surface,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
            }}
        >
            {segments.map((segment) => {
                const selected = segment.keyword === selectedKeyword || segment.pageId === currentPageId;
                const href = pageUrlToMobileRoute(segment.url, segment.keyword);
                return (
                    <Pressable
                        key={segment.pageId}
                        accessibilityRole="tab"
                        accessibilityState={{ selected }}
                        accessibilityLabel={segment.label}
                        onLayout={(event) => {
                            const { x, width } = event.nativeEvent.layout;
                            tabLayoutsRef.current.set(segment.keyword, { x, width });
                        }}
                        onPress={() => {
                            setSelectedKeyword(segment.keyword);
                            scrollActiveIntoView(segment.keyword);
                            router.push(href);
                        }}
                        style={({ pressed }) => ({
                            flex: useFullWidth ? 1 : undefined,
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 46,
                            minWidth: useFullWidth ? 0 : 88,
                            maxWidth: useFullWidth ? undefined : 240,
                            paddingHorizontal: useFullWidth ? 6 : 16,
                            paddingTop: 8,
                            opacity: pressed ? 0.7 : 1,
                        })}
                    >
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                paddingBottom: 8,
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
                                size={15}
                                color={selected ? colors.primaryStrong : colors.textMuted}
                            />
                            <Text
                                numberOfLines={1}
                                style={{
                                    flexShrink: 1,
                                    color: selected ? colors.primaryStrong : colors.textMuted,
                                    fontWeight: selected ? '700' : '600',
                                    fontSize: 13.5,
                                    textAlign: 'center',
                                }}
                            >
                                {segment.label}
                            </Text>
                        </View>
                        {/* Active underline indicator */}
                        <View
                            style={{
                                alignSelf: 'stretch',
                                height: 3,
                                borderTopLeftRadius: 3,
                                borderTopRightRadius: 3,
                                backgroundColor: selected ? colors.primaryStrong : 'transparent',
                            }}
                        />
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}
