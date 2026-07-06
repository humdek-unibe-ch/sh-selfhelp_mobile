/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Drawer content — lists `mobile_drawer` menu items as a collapsible tree.
 *
 * Parents render a chevron toggle and start collapsed, except the active
 * trail (ancestors of the current page), which auto-expands on navigation.
 * Pressing a row with a page navigates; group rows (no page) toggle instead.
 */

import { useEffect, useMemo, useState } from 'react';
import { router, usePathname } from 'expo-router';
import { Image, Pressable, Text, View } from 'react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import type { INavigationMenuItem } from '@selfhelp/shared';
import { expandedIdsForActiveTrail, isMenuItemActiveOnMobile, resolveAssetUrl } from '@selfhelp/shared';

import { useNavigation } from '@/hooks/useNavigation';
import { useAppColors } from '@/hooks/useAppColors';
import { useServerStore } from '@/stores/serverStore';
import {
    getDrawerMenuItems,
    getNavigationItemHref,
    getNavigationItemLabel,
    menuItemToPageItem,
} from './navigationUtils';
import { PageMenuIcon } from './PageMenuIcon';

export function CmsDrawerContent(props: DrawerContentComponentProps): React.ReactElement {
    const pathname = usePathname();
    const colors = useAppColors();
    const baseUrl = useServerStore((s) => s.serverUrl) ?? '';
    const { data: navigation, isLoading, error } = useNavigation();
    const tree = getDrawerMenuItems(navigation);

    // Global branding (Navigation → Settings): logo image + accessible name.
    const branding = navigation?.branding ?? null;
    const brandTitle = branding?.logo_alt?.trim() || 'Menu';
    const brandLogoUrl = branding?.logo_url ? resolveAssetUrl(branding.logo_url, baseUrl) : null;

    const activeTrailIds = useMemo(
        () => expandedIdsForActiveTrail(tree, pathname, 'mobile'),
        [tree, pathname],
    );
    const [expandedIds, setExpandedIds] = useState<Set<number>>(activeTrailIds);

    // Auto-expand the trail to the current page; keep manually opened branches open.
    useEffect(() => {
        setExpandedIds((previous) => {
            const merged = new Set(previous);
            for (const id of activeTrailIds) {
                merged.add(id);
            }
            return merged.size === previous.size ? previous : merged;
        });
    }, [activeTrailIds]);

    const toggleExpanded = (id: number): void => {
        setExpandedIds((previous) => {
            const next = new Set(previous);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleNavigate = (item: INavigationMenuItem): void => {
        props.navigation.closeDrawer();
        router.push(getNavigationItemHref(item));
    };

    return (
        <DrawerContentScrollView
            {...props}
            contentContainerStyle={{ paddingTop: 12 }}
            style={{ backgroundColor: colors.surface }}
        >
            <View
                style={{
                    paddingHorizontal: 16,
                    paddingBottom: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                }}
            >
                {brandLogoUrl ? (
                    <Image
                        source={{ uri: brandLogoUrl }}
                        accessibilityLabel={brandTitle}
                        style={{ width: 32, height: 32, borderRadius: 6 }}
                        resizeMode="contain"
                    />
                ) : null}
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{brandTitle}</Text>
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
                    expandedIds={expandedIds}
                    onNavigate={handleNavigate}
                    onToggle={toggleExpanded}
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
    expandedIds: Set<number>;
    onNavigate: (item: INavigationMenuItem) => void;
    onToggle: (id: number) => void;
}

function DrawerEntry({
    item,
    pathname,
    depth,
    expandedIds,
    onNavigate,
    onToggle,
}: IDrawerEntryProps): React.ReactElement {
    const active = isMenuItemActiveOnMobile(item, pathname);
    const colors = useAppColors();
    const page = menuItemToPageItem(item);
    const children = item.children ?? [];
    const hasChildren = children.length > 0;
    const expanded = expandedIds.has(item.id);
    // Rows without a navigable target (group headings) toggle on press instead.
    const navigable = item.page != null || (item.item_type === 'external_url' && item.external_url != null);
    const label = getNavigationItemLabel(item);

    const handleRowPress = (): void => {
        if (navigable) {
            onNavigate(item);
            return;
        }
        if (hasChildren) {
            onToggle(item.id);
        }
    };

    return (
        <View>
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: active ? colors.activeSurface : 'transparent',
                }}
            >
                <Pressable
                    onPress={handleRowPress}
                    accessibilityRole={navigable ? 'link' : 'button'}
                    accessibilityLabel={item.aria_label?.trim() || label}
                    accessibilityState={hasChildren && !navigable ? { expanded } : undefined}
                    style={({ pressed }) => ({
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        paddingVertical: 10,
                        paddingHorizontal: 16 + depth * 14,
                        backgroundColor: pressed ? colors.surfaceMuted : 'transparent',
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
                        {label}
                    </Text>
                </Pressable>
                {hasChildren ? (
                    <Pressable
                        onPress={() => onToggle(item.id)}
                        accessibilityRole="button"
                        accessibilityLabel={expanded ? `Collapse ${label}` : `Expand ${label}`}
                        accessibilityState={{ expanded }}
                        hitSlop={8}
                        style={({ pressed }) => ({
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            opacity: pressed ? 0.6 : 1,
                        })}
                    >
                        <Text
                            style={{
                                fontSize: 12,
                                fontWeight: '700',
                                color: active ? colors.primaryStrong : colors.textMuted,
                            }}
                        >
                            {expanded ? '▾' : '▸'}
                        </Text>
                    </Pressable>
                ) : null}
            </View>
            {expanded
                ? children.map((child) => (
                      <DrawerEntry
                          key={String(child.id)}
                          item={child}
                          pathname={pathname}
                          depth={depth + 1}
                          expandedIds={expandedIds}
                          onNavigate={onNavigate}
                          onToggle={onToggle}
                      />
                  ))
                : null}
        </View>
    );
}
