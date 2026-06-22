/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Carousel state hooks: pagination index + scroll-to helpers. Pulled
 * out of the render file so the render reads as plain JSX.
 *
 * `pageWidth` is measured from the carousel container (via `onLayout`) and
 * passed in, so snapping aligns even when the carousel is narrower than the
 * window (inside a padded container).
 */

import { useCallback, useRef, useState } from 'react';
import type { FlatList, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import type { IPageSectionWithFields } from '@selfhelp/shared';

export function useCarouselPaging(
    itemCount: number,
    pageWidth: number,
): {
    listRef: React.RefObject<FlatList<IPageSectionWithFields> | null>;
    index: number;
    onMomentumEnd: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
    goTo: (i: number) => void;
} {
    const listRef = useRef<FlatList<IPageSectionWithFields> | null>(null);
    const [index, setIndex] = useState(0);

    const onMomentumEnd = useCallback(
        (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
            if (pageWidth <= 0) return;
            setIndex(Math.round(event.nativeEvent.contentOffset.x / pageWidth));
        },
        [pageWidth]
    );

    const goTo = useCallback(
        (i: number): void => {
            const next = Math.max(0, Math.min(itemCount - 1, i));
            listRef.current?.scrollToIndex({ index: next, animated: true });
            setIndex(next);
        },
        [itemCount]
    );

    return { listRef, index, onMomentumEnd, goTo };
}
