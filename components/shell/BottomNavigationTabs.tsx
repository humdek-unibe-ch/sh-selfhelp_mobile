/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Bottom tab bar — top-level `mobile_bottom_tabs` menu items.
 *
 * Group items act as holder tabs: pressing one routes to its first
 * menu-visible child (`resolveTabPressHref`), and the tab renders the
 * group's own `mobile_icon` / label since it has no page of its own.
 */

import { router, usePathname } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useNavigation } from '@/hooks/useNavigation';
import { useAppColors } from '@/hooks/useAppColors';
import {
    getBottomTabMenuItems,
    getNavigationItemLabel,
    menuItemToPageItem,
    resolveTabPressHref,
} from './navigationUtils';
import { isBottomTabMenuItemActive, type INavigationMenuItem, type IPageItem } from '@selfhelp/shared';

import { PageMenuIcon } from './PageMenuIcon';

/** Icon stub for page-less (group holder) tabs so they still show an icon. */
function iconStubForItem(item: INavigationMenuItem): IPageItem {
    const label = getNavigationItemLabel(item);
    return {
        id: item.id,
        keyword: label,
        url: null,
        parent_page_id: null,
        is_headless: false,
        title: label,
        icon: item.icon,
        mobile_icon: item.mobile_icon,
        children: [],
    };
}

export function BottomNavigationTabs(): React.ReactElement | null {
    const pathname = usePathname();
    const colors = useAppColors();
    const { data: navigation } = useNavigation();
    const tabs = getBottomTabMenuItems(navigation);

    if (tabs.length === 0) return null;

    return (
        <View
            style={{
                flexDirection: 'row',
                borderTopWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                paddingBottom: 4,
            }}
        >
            {tabs.map((item) => {
                const href = resolveTabPressHref(item);
                const active = isBottomTabMenuItemActive(item, pathname);
                const page = menuItemToPageItem(item) ?? iconStubForItem(item);
                return (
                    <Pressable
                        key={String(item.id)}
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
                                backgroundColor: active ? colors.primaryStrong : 'transparent',
                                marginBottom: 4,
                            }}
                        />
                        <PageMenuIcon
                            page={page}
                            size={22}
                            color={active ? colors.primaryStrong : colors.textFaint}
                        />
                        <Text
                            numberOfLines={1}
                            style={{
                                color: active ? colors.primaryStrong : colors.textMuted,
                                fontSize: 11,
                                fontWeight: active ? '700' : '500',
                                marginTop: 2,
                            }}
                        >
                            {getNavigationItemLabel(item)}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}
