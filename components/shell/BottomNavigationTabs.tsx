/*

SPDX-FileCopyrightText: 2026 Humdek, University of Bern

SPDX-License-Identifier: MPL-2.0

*/

/**

 * Bottom tab bar — top-level `mobile_bottom_tabs` menu items.

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
import { isBottomTabMenuItemActive } from '@selfhelp/shared';

import { PageMenuIcon } from './PageMenuIcon';



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

                const page = menuItemToPageItem(item);

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

                        {page ? (

                            <PageMenuIcon

                                page={page}

                                size={22}

                                color={active ? colors.primaryStrong : colors.textFaint}

                            />

                        ) : null}

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

