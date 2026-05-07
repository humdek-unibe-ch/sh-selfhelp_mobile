/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField } from '@/components/renderer/useField';
import { colorToHex } from '@selfhelp/shared';

const POSITION_TO_STYLE: Record<string, { top?: number; bottom?: number; left?: number; right?: number }> = {
    'top-start': { top: -2, left: -2 },
    'top-end': { top: -2, right: -2 },
    'bottom-start': { bottom: -2, left: -2 },
    'bottom-end': { bottom: -2, right: -2 },
    'top-center': { top: -2 },
    'bottom-center': { bottom: -2 },
};

export function Indicator({ section, values }: IStyleProps): React.ReactElement {
    const color = readField<string>(section, 'mantine_color') ?? 'red';
    const position = readField<string>(section, 'mantine_indicator_position') ?? 'top-end';
    const fill = colorToHex(color, 6) ?? '#fa5252';

    return (
        <View className={buildSectionClasses(section)} style={{ position: 'relative', alignSelf: 'flex-start' }}>
            <Children sections={(section as { children?: never }).children as never} values={values} />
            <View
                style={{
                    position: 'absolute',
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: fill,
                    borderWidth: 2,
                    borderColor: '#fff',
                    ...POSITION_TO_STYLE[position],
                }}
            />
        </View>
    );
}
