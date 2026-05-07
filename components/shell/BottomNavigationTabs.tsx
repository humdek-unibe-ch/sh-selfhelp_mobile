/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Bottom tab bar — first `MAX_BOTTOM_TABS` top-level menu pages.
 *
 * The active tab is highlighted with the brand colour, an underline
 * indicator on the icon, and a heavier label weight, matching the
 * pattern used elsewhere in the shell (drawer + segmented child tabs).
 */

import { router, usePathname } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { usePages } from '@/hooks/usePages';
import { getPageHref, getPageLabel, getTopLevelMenuPages, iconForPage, isPageActive } from './navigationUtils';

const MAX_BOTTOM_TABS = 5;

export function BottomNavigationTabs(): React.ReactElement | null {
    const pathname = usePathname();
    const { data } = usePages();
    const tabs = getTopLevelMenuPages(data ?? []).slice(0, MAX_BOTTOM_TABS);

    if (tabs.length === 0) return null;

    return (
        <View
            style={{
                flexDirection: 'row',
                borderTopWidth: 1,
                borderColor: '#e9ecef',
                backgroundColor: '#ffffff',
                paddingBottom: 4,
            }}
        >
            {tabs.map((page) => {
                const href = getPageHref(page);
                const active = isPageActive(page, pathname);
                return (
                    <Pressable
                        key={page.id ?? page.keyword}
                        onPress={() => router.push(href)}
                        style={({ pressed }) => ({
                            flex: 1,
                            alignItems: 'center',
                            paddingVertical: 8,
                            paddingHorizontal: 4,
                            opacity: pressed ? 0.7 : 1,
                        })}
                    >
                        <View
                            style={{
                                width: 32,
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: active ? '#1c7ed6' : 'transparent',
                                marginBottom: 4,
                            }}
                        />
                        <Text
                            style={{
                                color: active ? '#1c7ed6' : '#868e96',
                                fontWeight: '700',
                                fontSize: 16,
                            }}
                        >
                            {iconForPage(page)}
                        </Text>
                        <Text
                            numberOfLines={1}
                            style={{
                                color: active ? '#1c7ed6' : '#495057',
                                fontSize: 11,
                                fontWeight: active ? '700' : '500',
                                marginTop: 2,
                            }}
                        >
                            {getPageLabel(page)}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}
