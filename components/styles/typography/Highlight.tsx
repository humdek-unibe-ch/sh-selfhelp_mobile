/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Text } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, useInterpolatedField } from '@/components/renderer/useField';
import { colorToHex } from '@selfhelp/shared';
import { useAppColors } from '@/hooks/useAppColors';

export function Highlight({ section, values }: IStyleProps): React.ReactElement {
    const color = readField<string>(section, 'color') ?? 'yellow';
    const text = useInterpolatedField(section, 'text', values);
    const highlight = useInterpolatedField(section, 'highlight_highlight', values);
    const colors = useAppColors();
    if (!highlight) {
        return <Text className={buildSectionClasses(section)} style={{ color: colors.text }}>{text}</Text>;
    }
    const bg = colorToHex(color, 2) ?? '#fff3bf';
    const idx = text.indexOf(highlight);
    if (idx === -1) return <Text className={buildSectionClasses(section)} style={{ color: colors.text }}>{text}</Text>;
    return (
        <Text className={buildSectionClasses(section)} style={{ color: colors.text }}>
            {text.slice(0, idx)}
            {/* The marker sits on a light shade-2 background in both themes, so the
                highlighted run keeps dark ink for contrast (like a highlighter pen). */}
            <Text style={{ backgroundColor: bg, color: '#212529' }}>{highlight}</Text>
            {text.slice(idx + highlight.length)}
        </Text>
    );
}
