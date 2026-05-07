/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * V1 carousel — horizontal FlatList with snap-to-page and prev/next
 * arrows. Swap to `react-native-reanimated-carousel` if autoplay /
 * infinite-loop / advanced easing is required.
 */

import { FlatList, Image, Pressable, Text, View } from 'react-native';

import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField } from '@/components/renderer/useField';
import { resolveAssetSources } from '@selfhelp/shared';
import { useServerStore } from '@/stores/serverStore';

import type { ICarouselSource } from './Carousel.types';
import { useCarouselPaging } from './Carousel.hooks';
import { styles } from './Carousel.styles';

export function Carousel({ section }: IStyleProps): React.ReactElement | null {
    const baseUrl = useServerStore((s) => s.serverUrl) ?? '';
    const sources = readField<ICarouselSource[]>(section, 'sources') ?? [];
    const resolved = resolveAssetSources(sources, baseUrl);

    const { listRef, index, onMomentumEnd, goTo, pageWidth } = useCarouselPaging(resolved.length);

    if (!resolved.length) return null;

    return (
        <View className={buildSectionClasses(section)} style={{ position: 'relative' }}>
            <FlatList
                ref={listRef}
                data={resolved}
                keyExtractor={(_, i) => String(i)}
                renderItem={({ item }) => (
                    <View style={[{ width: pageWidth }, styles.page]}>
                        <Image source={{ uri: item.src }} style={styles.image} resizeMode="cover" />
                    </View>
                )}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onMomentumEnd}
                getItemLayout={(_, i) => ({ length: pageWidth, offset: pageWidth * i, index: i })}
            />
            <View style={styles.dotsRow}>
                {resolved.map((_, i) => (
                    <View
                        key={i}
                        style={[styles.dotBase, i === index ? styles.dotActive : styles.dotInactive]}
                    />
                ))}
            </View>
            {resolved.length > 1 ? (
                <View style={styles.arrowsOverlay} pointerEvents="box-none">
                    <Pressable onPress={() => goTo(index - 1)} style={[styles.arrowButton, styles.arrowLeft]}>
                        <Text style={styles.arrowText}>{'\u2039'}</Text>
                    </Pressable>
                    <Pressable onPress={() => goTo(index + 1)} style={[styles.arrowButton, styles.arrowRight]}>
                        <Text style={styles.arrowText}>{'\u203A'}</Text>
                    </Pressable>
                </View>
            ) : null}
        </View>
    );
}
