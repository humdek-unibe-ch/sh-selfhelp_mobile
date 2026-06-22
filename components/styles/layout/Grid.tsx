/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField } from '@/components/renderer/useField';
import { ALIGN_TO_CLASS, JUSTIFY_TO_CLASS, gapToClass } from '@/styles/mantineToTailwind';
import { readSizingStyle } from './_sizing';

export function Grid({ section, values }: IStyleProps): React.ReactElement {
    const justify = readField<string>(section, 'shared_justify');
    const align = readField<string>(section, 'shared_align');
    const gap = readField<string>(section, 'shared_gap') ?? 'md';

    return (
        <View
            className={buildSectionClasses(section, {
                extra: [
                    'flex',
                    'flex-row',
                    'flex-wrap',
                    justify ? JUSTIFY_TO_CLASS[justify] : undefined,
                    align ? ALIGN_TO_CLASS[align] : undefined,
                    gapToClass(gap),
                ],
            })}
            style={readSizingStyle(section)}
        >
            <Children sections={(section as { children?: never }).children} values={values} />
        </View>
    );
}
