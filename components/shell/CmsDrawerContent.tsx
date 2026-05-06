import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { usePages } from '@/hooks/usePages';
import { flattenPages, getPageHref, getPageLabel, iconForPage } from './navigationUtils';

export function CmsDrawerContent(props: DrawerContentComponentProps): React.ReactElement {
    const { data, isLoading, error } = usePages();

    return (
        <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 12 }}>
            <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: '700' }}>Menu</Text>
            </View>
            {isLoading ? <Text style={{ paddingHorizontal: 16, color: '#666' }}>Loading…</Text> : null}
            {error ? <Text style={{ paddingHorizontal: 16, color: '#fa5252' }}>{error.message}</Text> : null}
            {(data ? flattenPages(data) : []).map((page) => (
                <Pressable
                    key={page.id ?? page.keyword}
                    onPress={() => {
                        props.navigation.closeDrawer();
                        router.push(getPageHref(page));
                    }}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        paddingVertical: 12,
                        paddingHorizontal: 16 + Math.max(0, page.parent_page_id ? 16 : 0),
                        borderBottomWidth: 1,
                        borderColor: '#f1f3f5',
                    }}
                >
                    <Text style={{ width: 22, textAlign: 'center', color: '#228be6', fontWeight: '700' }}>
                        {iconForPage(page)}
                    </Text>
                    <Text style={{ flex: 1, fontSize: 15 }}>{getPageLabel(page)}</Text>
                </Pressable>
            ))}
        </DrawerContentScrollView>
    );
}
