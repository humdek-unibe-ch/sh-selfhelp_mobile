/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Text, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { useInterpolatedField, useInlineFormattedField, readField } from '@/components/renderer/useField';
import { InlineText } from '@/components/renderer/InlineText';
import { colorToHex } from '@selfhelp/shared';
import { useAppColors } from '@/hooks/useAppColors';

export function Blockquote({ section, values }: IStyleProps): React.ReactElement {
    // Dedicated markdown-inline field — keep the author's inline bold/italic/
    // underline/links via InlineText instead of stripping to plain text.
    const nodes = useInlineFormattedField(section, 'blockquote_content', values);
    const cite = useInterpolatedField(section, 'cite', values);
    const color = readField<string>(section, 'color') ?? 'blue';
    const colors = useAppColors();
    const accent = colorToHex(color, colors.isDark ? 5 : 6) ?? colors.primary;
    return (
        <View
            className={buildSectionClasses(section)}
            style={{ borderLeftWidth: 4, borderLeftColor: accent, paddingLeft: 12, paddingVertical: 8, marginVertical: 8 }}
        >
            <InlineText nodes={nodes} linkColor={accent} style={{ fontStyle: 'italic', color: colors.text }} />
            {cite ? <Text style={{ marginTop: 6, color: colors.textFaint, fontSize: 12 }}>— {cite}</Text> : null}
        </View>
    );
}
