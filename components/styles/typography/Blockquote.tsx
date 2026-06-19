/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Text, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { useInterpolatedField, readField } from '@/components/renderer/useField';
import { colorToHex } from '@selfhelp/shared';

export function Blockquote({ section, values }: IStyleProps): React.ReactElement {
    const content = useInterpolatedField(section, 'content', values);
    const cite = useInterpolatedField(section, 'cite', values);
    const color = readField<string>(section, 'shared_color') ?? 'blue';
    return (
        <View
            className={buildSectionClasses(section)}
            style={{ borderLeftWidth: 4, borderLeftColor: colorToHex(color, 6) ?? '#228be6', paddingLeft: 12, paddingVertical: 8, marginVertical: 8 }}
        >
            <Text style={{ fontStyle: 'italic', color: '#495057' }}>{content}</Text>
            {cite ? <Text style={{ marginTop: 6, color: '#868e96', fontSize: 12 }}>— {cite}</Text> : null}
        </View>
    );
}
