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
import { readSizingStyle } from './_sizing';

/**
 * SimpleGrid renders rows of N equal-width columns. The column count is the
 * cross-platform `cols` (read on web AND mobile); the web-only
 * responsive overrides (`web_cols_sm`/`md`/`lg`) are intentionally ignored here
 * — mobile uses the single base count. Horizontal spacing is `gap`,
 * row spacing is `vertical_spacing`.
 *
 * Gutters use the border-box model (padding inside each cell's percentage
 * width) so the row always sums to exactly 100% — no negative margins, no
 * horizontal overflow.
 */
export function SimpleGrid({ section, values }: IStyleProps): React.ReactElement {
    const cols = Math.max(1, readNumberField(section, 'cols', 2) ?? 2);
    const colGap = SPACING_PX[(readField<string>(section, 'gap') ?? 'md') as TCanonicalSpacing] ?? 16;
    const rowGap = SPACING_PX[(readField<string>(section, 'vertical_spacing') ?? 'md') as TCanonicalSpacing] ?? 16;

    const children = ((section as { children?: never }).children as never as React.ReactNode[]) ?? [];
    const arr = Array.isArray(children) ? children : [];

    return (
        <View
            className={buildSectionClasses(section)}
            style={{ flexDirection: 'row', flexWrap: 'wrap', ...readSizingStyle(section) }}
        >
            {arr.map((child, i) => (
                <View key={i} style={{ width: `${100 / cols}%`, paddingHorizontal: colGap / 2, marginBottom: rowGap }}>
                    <BasicStyle section={child as never} values={values} />
                </View>
            ))}
        </View>
    );
}
