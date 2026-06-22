/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField } from '@/components/renderer/useField';
import {
    ALIGN_TO_CLASS,
    DIRECTION_TO_CLASS,
    JUSTIFY_TO_CLASS,
    gapToClass,
} from '@/styles/mantineToTailwind';
import { readSizingStyle } from './_sizing';

export function FlexBox({ section, values }: IStyleProps): React.ReactElement {
    const justify = readField<string>(section, 'shared_justify');
    const align = readField<string>(section, 'shared_align');
    const direction = readField<string>(section, 'shared_direction') ?? 'row';
    const wrap = readField<string>(section, 'shared_wrap');
    const gap = readField<string>(section, 'shared_gap');

    const extra = [
        'flex',
        DIRECTION_TO_CLASS[direction] ?? 'flex-row',
        justify ? JUSTIFY_TO_CLASS[justify] : undefined,
        align ? ALIGN_TO_CLASS[align] : undefined,
        wrap === 'wrap' ? 'flex-wrap' : wrap === 'nowrap' ? 'flex-nowrap' : undefined,
        gapToClass(gap),
    ];

    return (
        <View className={buildSectionClasses(section, { extra })} style={readSizingStyle(section)}>
            <Children sections={(section as { children?: never }).children} values={values} />
        </View>
    );
}
