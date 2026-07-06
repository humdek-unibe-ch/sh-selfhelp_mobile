/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Auto-generated navigation list — used by the menu screen as a
 * fallback when the CMS instance does not provide a custom `menu`
 * keyword. Pulls accessible pages from `/cms-api/v1/pages` (already
 * filtered server-side by the X-Client-Type=mobile header) and shows
 * only those assigned to a navigation menu position.
 */

import { router, usePathname } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { usePages } from '@/hooks/usePages';
import { flattenPages, getPageHref, getPageLabel, isPageActive } from './navigationUtils';

export function PageList(): React.ReactElement {
    const { t } = useTranslation();
    const pathname = usePathname();
    const { data, isLoading, error } = usePages();
    const items = data ? flattenPages(data) : [];

    if (isLoading) return <Text>{t('loading')}</Text>;
    if (error) return <Text style={{ color: '#fa5252' }}>{(error).message}</Text>;
    if (!items.length) return <Text>{t('menu.empty', 'No pages available')}</Text>;

    return (
        <View style={{ gap: 4 }}>
            {items.map((p) => {
                const active = isPageActive(p, pathname);
                return (
                    <Pressable
                        key={p.id ?? p.keyword}
                        onPress={() => router.push(getPageHref(p))}
                        style={{
                            paddingVertical: 12,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                            backgroundColor: active ? '#e7f5ff' : 'transparent',
                            borderLeftWidth: 3,
                            borderLeftColor: active ? '#1c7ed6' : 'transparent',
                            borderBottomWidth: 1,
                            borderBottomColor: '#f1f3f5',
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 16,
                                fontWeight: active ? '700' : '500',
                                color: active ? '#1864ab' : '#343a40',
                            }}
                        >
                            {getPageLabel(p)}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}
