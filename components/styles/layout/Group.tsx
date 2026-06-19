/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField } from '@/components/renderer/useField';
import { ALIGN_TO_CLASS, JUSTIFY_TO_CLASS, gapToClass } from '@/styles/mantineToTailwind';

export function Group({ section, values }: IStyleProps): React.ReactElement {
    const justify = readField<string>(section, 'shared_justify');
    const align = readField<string>(section, 'shared_align') ?? 'center';
    const wrap = readBooleanField(section, 'web_group_wrap', false);
    const grow = readBooleanField(section, 'web_group_grow', false);
    const gap = readField<string>(section, 'shared_gap') ?? 'md';

    const extra = [
        'flex',
        'flex-row',
        wrap ? 'flex-wrap' : 'flex-nowrap',
        grow ? 'flex-1' : undefined,
        justify ? JUSTIFY_TO_CLASS[justify] : undefined,
        ALIGN_TO_CLASS[align] ?? 'items-center',
        gapToClass(gap),
    ];

    return (
        <View className={buildSectionClasses(section, { extra })}>
            <Children sections={(section as { children?: never }).children} values={values} />
        </View>
    );
}
