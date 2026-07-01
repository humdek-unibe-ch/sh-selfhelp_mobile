/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Drawer content — lists `mobile_drawer` menu items in tree order.
 */

import { router, usePathname } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import type { INavigationMenuItem } from '@selfhelp/shared';

import { useNavigation } from '@/hooks/useNavigation';
import { useAppColors } from '@/hooks/useAppColors';
import {
    getDrawerMenuItems,
    getNavigationItemHref,
    getNavigationItemLabel,
    isNavigationItemActive,
    menuItemToPageItem,
} from './navigationUtils';
import { PageMenuIcon } from './PageMenuIcon';

export function CmsDrawerContent(props: DrawerContentComponentProps): React.ReactElement {
    const pathname = usePathname();
    const colors = useAppColors();
    const { data: navigation, isLoading, error } = useNavigation();
    const tree = getDrawerMenuItems(navigation);

    const handlePress = (item: INavigationMenuItem): void => {
        props.navigation.closeDrawer();
        router.push(getNavigationItemHref(item));
    };

    return (
        <DrawerContentScrollView
            {...props}
            contentContainerStyle={{ paddingTop: 12 }}
            style={{ backgroundColor: colors.surface }}
        >
            <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Menu</Text>
            </View>
            {isLoading ? (
                <Text style={{ paddingHorizontal: 16, color: colors.textFaint }}>Loading…</Text>
            ) : null}
            {error ? (
                <Text style={{ paddingHorizontal: 16, color: colors.danger }}>{error.message}</Text>
            ) : null}
            {tree.map((item) => (
                <DrawerEntry
                    key={String(item.id)}
                    item={item}
                    pathname={pathname}
                    depth={0}
                    onPress={handlePress}
                />
            ))}
            {!isLoading && !error && tree.length === 0 ? (
                <Text style={{ paddingHorizontal: 16, color: colors.textFaint }}>No menu pages.</Text>
            ) : null}
        </DrawerContentScrollView>
    );
}

interface IDrawerEntryProps {
    item: INavigationMenuItem;
    pathname: string;
    depth: number;
    onPress: (item: INavigationMenuItem) => void;
}

function DrawerEntry({ item, pathname, depth, onPress }: IDrawerEntryProps): React.ReactElement {
    const active = isNavigationItemActive(item, pathname);
    const colors = useAppColors();
    const page = menuItemToPageItem(item);
    const children = item.children ?? [];

    return (
        <View>
            <Pressable
                onPress={() => onPress(item)}
                style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingVertical: 10,
                    paddingHorizontal: 16 + depth * 14,
                    backgroundColor: active ? colors.activeSurface : pressed ? colors.surfaceMuted : 'transparent',
                })}
            >
                {page ? (
                    <PageMenuIcon
                        page={page}
                        size={20}
                        color={active ? colors.primaryStrong : colors.textMuted}
                    />
                ) : null}
                <Text
                    style={{
                        flex: 1,
                        fontSize: 15,
                        fontWeight: active ? '700' : '500',
                        color: active ? colors.primaryStrong : colors.text,
                    }}
                >
                    {getNavigationItemLabel(item)}
                </Text>
            </Pressable>
            {children.map((child) => (
                <DrawerEntry
                    key={String(child.id)}
                    item={child}
                    pathname={pathname}
                    depth={depth + 1}
                    onPress={onPress}
                />
            ))}
        </View>
    );
}
