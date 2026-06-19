/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Text } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, useInterpolatedField } from '@/components/renderer/useField';
import { colorToHex } from '@selfhelp/shared';

export function Highlight({ section, values }: IStyleProps): React.ReactElement {
    const color = readField<string>(section, 'shared_color') ?? 'yellow';
    const text = useInterpolatedField(section, 'text', values);
    const highlight = useInterpolatedField(section, 'highlight_highlight', values);
    if (!highlight) {
        return <Text className={buildSectionClasses(section)}>{text}</Text>;
    }
    const bg = colorToHex(color, 2) ?? '#fff3bf';
    const idx = text.indexOf(highlight);
    if (idx === -1) return <Text className={buildSectionClasses(section)}>{text}</Text>;
    return (
        <Text className={buildSectionClasses(section)}>
            {text.slice(0, idx)}
            <Text style={{ backgroundColor: bg }}>{highlight}</Text>
            {text.slice(idx + highlight.length)}
        </Text>
    );
}
