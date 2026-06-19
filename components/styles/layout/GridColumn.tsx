/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { View, type DimensionValue } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField } from '@/components/renderer/useField';

export function GridColumn({ section, values }: IStyleProps): React.ReactElement {
    const span = readField<string>(section, 'web_grid_span');
    let widthPct: DimensionValue | undefined;
    if (span && span !== 'auto' && span !== 'content') {
        const n = Number(span);
        if (Number.isFinite(n) && n > 0) widthPct = `${(n / 12) * 100}%`;
    }

    return (
        <View
            className={buildSectionClasses(section)}
            style={{ width: widthPct ?? 'auto', flexGrow: span === 'auto' ? 1 : 0, flexBasis: widthPct }}
        >
            <Children sections={(section as { children?: never }).children} values={values} />
        </View>
    );
}
