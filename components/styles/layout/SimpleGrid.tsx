/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { BasicStyle } from '@/components/renderer/BasicStyle';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readNumberField } from '@/components/renderer/useField';
import { SPACING_PX } from '@selfhelp/shared';
import type { TCanonicalSpacing } from '@selfhelp/shared';

/**
 * SimpleGrid renders rows of N equal-width columns. Mobile is single
 * column up to ~600dp; we keep it simple: respect `mantine_cols` always.
 */
export function SimpleGrid({ section, values }: IStyleProps): React.ReactElement {
    const cols = readNumberField(section, 'mantine_cols', 2) ?? 2;
    const spacingKey = readField<string>(section, 'mantine_spacing') ?? 'md';
    const gap = SPACING_PX[spacingKey as TCanonicalSpacing] ?? 16;

    const children = ((section as { children?: never }).children as never as React.ReactNode[]) ?? [];
    const arr = Array.isArray(children) ? children : [];

    return (
        <View
            className={buildSectionClasses(section)}
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}
        >
            {arr.map((child, i) => (
                <View key={i} style={{ width: `${100 / cols}%` }}>
                    <BasicStyle section={child as never} values={values} />
                </View>
            ))}
        </View>
    );
}
