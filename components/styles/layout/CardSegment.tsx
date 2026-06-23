/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readBooleanField } from '@/components/renderer/useField';
import { useAppColors } from '@/hooks/useAppColors';

/**
 * CardSegment — an edge-to-edge band inside a Card. `border` opts into a
 * themed top divider (matches the web Mantine `Card.Section withBorder`). The
 * divider colour resolves through the theme so it stays visible in dark mode.
 * `web_segment_inherit_padding` is web-only and intentionally not read here.
 */
export function CardSegment({ section, values }: IStyleProps): React.ReactElement {
    const colors = useAppColors();
    const withBorder = readBooleanField(section, 'border', false);

    return (
        <View
            className={buildSectionClasses(section)}
            style={{
                marginHorizontal: -16,
                paddingHorizontal: 16,
                paddingVertical: 8,
                ...(withBorder ? { borderTopWidth: 1, borderColor: colors.border } : {}),
            }}
        >
            <Children sections={(section as { children?: never }).children} values={values} />
        </View>
    );
}
