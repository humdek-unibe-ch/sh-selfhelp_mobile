/**
 * Auto-generated navigation list — used by the menu screen as a
 * fallback when the CMS instance does not provide a custom `menu`
 * keyword. Pulls accessible pages from `/cms-api/v1/pages` (already
 * filtered server-side by the X-Client-Type=mobile header).
 */

import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { usePages } from '@/hooks/usePages';
import { flattenPages, getPageHref, getPageLabel } from './navigationUtils';

export function PageList(): React.ReactElement {
    const { t } = useTranslation();
    const { data, isLoading, error } = usePages();

    if (isLoading) return <Text>{t('loading')}</Text>;
    if (error) return <Text style={{ color: '#fa5252' }}>{(error as Error).message}</Text>;
    if (!data?.length) return <Text>{t('menu.empty', 'No pages available')}</Text>;

    return (
        <View style={{ gap: 4 }}>
            {flattenPages(data).map((p) => {
                const label = getPageLabel(p);
                return (
                    <Pressable
                        key={p.id ?? p.keyword}
                        onPress={() => router.push(getPageHref(p))}
                        style={{
                            paddingVertical: 12,
                            paddingHorizontal: 8,
                            borderBottomWidth: 1,
                            borderColor: '#e9ecef',
                        }}
                    >
                        <Text style={{ fontSize: 16 }}>{label}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}
