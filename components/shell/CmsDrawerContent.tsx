/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Drawer content — lists CMS menu pages (only those with a
 * `navPosition`), in tree order. Children are indented and inherit
 * the parent's tap behaviour. Whichever page matches the current URL
 * (or whose descendant matches) is highlighted so users always know
 * where they are.
 */

import { router, usePathname } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import type { IPageItem } from '@selfhelp/shared';

import { usePages } from '@/hooks/usePages';
import { useAppColors } from '@/hooks/useAppColors';
import {
    getMenuTree,
    getPageHref,
    getPageLabel,
    iconForPage,
    isPageActive,
} from './navigationUtils';

export function CmsDrawerContent(props: DrawerContentComponentProps): React.ReactElement {
    const pathname = usePathname();
    const colors = useAppColors();
    const { data, isLoading, error } = usePages();
    const tree = data ? getMenuTree(data) : [];

    const handlePress = (page: IPageItem): void => {
        props.navigation.closeDrawer();
        router.push(getPageHref(page));
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
            {tree.map((page) => (
                <DrawerEntry
                    key={page.id ?? page.keyword}
                    page={page}
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
    page: IPageItem;
    pathname: string;
    depth: number;
    onPress: (page: IPageItem) => void;
}

function DrawerEntry({ page, pathname, depth, onPress }: IDrawerEntryProps): React.ReactElement {
    const active = isPageActive(page, pathname);
    const colors = useAppColors();
    return (
        <View>
            <Pressable
                onPress={() => onPress(page)}
                style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 12,
                    paddingLeft: 16 + depth * 16,
                    paddingRight: 16,
                    backgroundColor: active ? colors.activeSurface : pressed ? colors.pressed : 'transparent',
                    borderLeftWidth: 3,
                    borderLeftColor: active ? colors.primaryStrong : 'transparent',
                })}
            >
                <Text
                    style={{
                        width: 22,
                        textAlign: 'center',
                        color: active ? colors.primaryStrong : colors.textFaint,
                        fontWeight: '700',
                    }}
                >
                    {iconForPage(page)}
                </Text>
                <Text
                    style={{
                        flex: 1,
                        fontSize: 15,
                        fontWeight: active ? '700' : '500',
                        color: active ? colors.primaryStrong : colors.text,
                    }}
                >
                    {getPageLabel(page)}
                </Text>
            </Pressable>
            {page.children?.map((child) => (
                <DrawerEntry
                    key={child.id ?? child.keyword}
                    page={child}
                    pathname={pathname}
                    depth={depth + 1}
                    onPress={onPress}
                />
            ))}
        </View>
    );
}
