/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField, readNumberField } from '@/components/renderer/useField';
import { gridSpanToReactNativeColumn } from '@selfhelp/shared';
import { readSizingStyle } from './_sizing';

/**
 * GridColumn is a child of `grid`. The cross-platform `grid_span`
 * ("6" | "auto" | "content" | responsive JSON) is mapped to a React Native
 * flex layout via the shared `gridSpanToReactNativeColumn` mapper (parent grid
 * assumed 12 columns, matching Mantine). `grid_offset` becomes a left
 * margin, `grid_grow` forces flex-grow.
 *
 * `grid_order` (CSS flex `order`) has no React Native equivalent — RN
 * flexbox cannot reorder children — so it only affects the web renderer.
 */
export function GridColumn({ section, values }: IStyleProps): React.ReactElement {
    const span = readField<string>(section, 'grid_span');
    const col = gridSpanToReactNativeColumn(span, 12);
    const grow = readBooleanField(section, 'grid_grow', false);
    const offset = readNumberField(section, 'grid_offset', 0) ?? 0;

    return (
        <View
            className={buildSectionClasses(section)}
            style={{
                flexGrow: grow ? 1 : col.flexGrow,
                flexShrink: col.flexShrink,
                flexBasis: col.flexBasis,
                ...(offset > 0 ? { marginLeft: `${(offset / 12) * 100}%` } : {}),
                ...readSizingStyle(section),
            }}
        >
            <Children sections={(section as { children?: never }).children} values={values} />
        </View>
    );
}
