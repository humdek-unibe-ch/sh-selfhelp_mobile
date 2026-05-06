import { Text } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, useInterpolatedField } from '@/components/renderer/useField';
import { FONT_SIZE_PX, LINE_HEIGHT, colorToHex } from '@selfhelp/shared';
import type { TMantineSize } from '@selfhelp/shared';

export function TextStyle({ section, values }: IStyleProps): React.ReactElement {
    const size = (readField<string>(section, 'mantine_size') as TMantineSize | undefined) ?? 'md';
    const color = readField<string>(section, 'mantine_color');
    const weight = readField<string>(section, 'mantine_text_font_weight');
    const fontStyle = readField<string>(section, 'mantine_text_font_style');
    const decoration = readField<string>(section, 'mantine_text_text_decoration');
    const transform = readField<string>(section, 'mantine_text_text_transform');
    const align = readField<string>(section, 'mantine_text_align');
    const textField = useInterpolatedField(section, 'text', values);
    const contentField = useInterpolatedField(section, 'content', values);
    const text = textField || contentField;

    const fontSize = FONT_SIZE_PX[size] ?? 16;
    const lineHeight = Math.round(fontSize * (LINE_HEIGHT[size] ?? 1.55));

    return (
        <Text
            className={buildSectionClasses(section)}
            style={{
                fontSize,
                lineHeight,
                color: colorToHex(color, 7) ?? '#373a40',
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
        >
            {text}
        </Text>
    );
}
