/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * V1 carousel — horizontal FlatList with snap-to-page and prev/next
 * arrows. Swap to `react-native-reanimated-carousel` if autoplay /
 * infinite-loop / advanced easing is required.
 *
 * Slides are the carousel section's **child sections** (mirrors the web
 * `CarouselStyle`, which renders `style.children` as `Carousel.Slide`s).
 * Each child is rendered through `BasicStyle` so any style — usually
 * `image` — can be a slide and goes through the normal renderer.
 */

import { useState } from 'react';
import { FlatList, type LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import type { IPageSectionWithFields } from '@selfhelp/shared';

import type { IStyleProps } from '@/components/renderer/types';
import { BasicStyle } from '@/components/renderer/BasicStyle';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { useAppColors } from '@/hooks/useAppColors';

import { useCarouselPaging } from './Carousel.hooks';
import { styles } from './Carousel.styles';

export function Carousel({ section, values }: IStyleProps): React.ReactElement | null {
    const colors = useAppColors();
    const slides = (section as { children?: IPageSectionWithFields[] }).children ?? [];
    const [pageWidth, setPageWidth] = useState(0);

    const { listRef, index, onMomentumEnd, goTo } = useCarouselPaging(slides.length, pageWidth);

    if (!slides.length) return null;

    const onLayout = (e: LayoutChangeEvent): void => setPageWidth(e.nativeEvent.layout.width);

    return (
        <View className={buildSectionClasses(section)} style={{ position: 'relative' }} onLayout={onLayout}>
            {pageWidth > 0 ? (
                <FlatList
                    ref={listRef}
                    data={slides}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={({ item }) => (
                        <View style={{ width: pageWidth }}>
                            <BasicStyle section={item} values={values} />
                        </View>
                    )}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={onMomentumEnd}
                    getItemLayout={(_, i) => ({ length: pageWidth, offset: pageWidth * i, index: i })}
                />
            ) : null}
            <View style={styles.dotsRow}>
                {slides.map((slide, i) => (
                    <View
                        key={slide.id}
                        style={[styles.dotBase, { backgroundColor: i === index ? colors.primary : colors.border }]}
                    />
                ))}
            </View>
            {slides.length > 1 ? (
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
