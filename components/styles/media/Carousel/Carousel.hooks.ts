/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Carousel state hooks: pagination index + scroll-to helpers. Pulled
 * out of the render file so the render reads as plain JSX.
 */

import { useCallback, useRef, useState } from 'react';
import { Dimensions, type FlatList, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import type { ICarouselSource } from './Carousel.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function useCarouselPaging(itemCount: number): {
    listRef: React.RefObject<FlatList<ICarouselSource> | null>;
    index: number;
    onMomentumEnd: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
    goTo: (i: number) => void;
    pageWidth: number;
} {
    const listRef = useRef<FlatList<ICarouselSource> | null>(null);
    const [index, setIndex] = useState(0);

    const onMomentumEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>): void => {
        const i = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        setIndex(i);
    }, []);

    const goTo = useCallback(
        (i: number): void => {
            const next = Math.max(0, Math.min(itemCount - 1, i));
            listRef.current?.scrollToIndex({ index: next, animated: true });
            setIndex(next);
        },
        [itemCount]
    );

    return { listRef, index, onMomentumEnd, goTo, pageWidth: SCREEN_WIDTH };
}
