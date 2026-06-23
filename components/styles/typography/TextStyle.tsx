/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, useInlineFormattedField } from '@/components/renderer/useField';
import { InlineText } from '@/components/renderer/InlineText';
import { FONT_SIZE_PX, LINE_HEIGHT, colorToHex } from '@selfhelp/shared';
import type { TMantineSize } from '@selfhelp/shared';
import { useAppColors } from '@/hooks/useAppColors';

export function TextStyle({ section, values }: IStyleProps): React.ReactElement {
    const size = (readField<string>(section, 'size') as TMantineSize | undefined) ?? 'md';
    const color = readField<string>(section, 'color');
    const weight = readField<string>(section, 'web_text_font_weight');
    const fontStyle = readField<string>(section, 'web_text_font_style');
    const decoration = readField<string>(section, 'web_text_text_decoration');
    const transform = readField<string>(section, 'web_text_text_transform');
    const align = readField<string>(section, 'text_align');
    // Keep the author's inline formatting (bold / italic / underline / link) by
    // parsing the safe subset into runs instead of stripping to plain text, so
    // Ctrl+B bold authored on the web also renders on mobile via <InlineText>.
    const textNodes = useInlineFormattedField(section, 'text', values);
    const contentNodes = useInlineFormattedField(section, 'content', values);
    const nodes = textNodes.length > 0 ? textNodes : contentNodes;
    const colors = useAppColors();

    const fontSize = FONT_SIZE_PX[size] ?? 16;
    const lineHeight = Math.round(fontSize * (LINE_HEIGHT[size] ?? 1.55));
    // Authored palette colours need a lighter shade on dark backgrounds (Mantine
    // does this automatically on web); with no authored colour fall back to the
    // theme's primary text token instead of a hardcoded near-black.
    const resolvedColor = color
        ? (colorToHex(color, colors.isDark ? 5 : 7) ?? colors.text)
        : colors.text;

    return (
        <InlineText
            className={buildSectionClasses(section)}
            nodes={nodes}
            linkColor={resolvedColor}
            style={{
                fontSize,
                lineHeight,
                color: resolvedColor,
                fontWeight: (weight as 'bold' | 'normal' | undefined) ?? 'normal',
                fontStyle: (fontStyle as 'italic' | 'normal' | undefined) ?? 'normal',
                textDecorationLine:
                    decoration === 'underline'
                        ? 'underline'
                        : decoration === 'line-through'
                            ? 'line-through'
                            : 'none',
                textTransform:
                    (transform as 'uppercase' | 'lowercase' | 'capitalize' | 'none' | undefined) ?? 'none',
                textAlign: (align as 'left' | 'right' | 'center' | 'justify' | undefined) ?? 'left',
            }}
        />
    );
}
