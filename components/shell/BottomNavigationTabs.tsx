import { router, usePathname } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { usePages } from '@/hooks/usePages';
import { getPageHref, getPageLabel, getTopLevelMenuPages, iconForPage } from './navigationUtils';

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
                backgroundColor: '#fff',
                paddingBottom: 4,
            }}
        >
            {tabs.map((page) => {
                const href = getPageHref(page);
                const active = pathname === href || (href === '/' && pathname === '/');
                return (
                    <Pressable
                        key={page.id ?? page.keyword}
                        onPress={() => router.push(href)}
                        style={{ flex: 1, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4 }}
                    >
                        <Text style={{ color: active ? '#228be6' : '#868e96', fontWeight: '700' }}>
                            {iconForPage(page)}
                        </Text>
                        <Text
                            numberOfLines={1}
                            style={{
                                color: active ? '#228be6' : '#495057',
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
