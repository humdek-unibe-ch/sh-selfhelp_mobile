/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Text } from 'react-native';
import { resolveMantineVariant } from '@selfhelp/shared';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, useInterpolatedField } from '@/components/renderer/useField';
import { useAppColors } from '@/hooks/useAppColors';

const ORDER_TO_GEOMETRY: Record<string, { fontSize: number; lineHeight: number; weight: '700' | '600'; letterSpacing: number; mt: number; mb: number }> = {
    '1': { fontSize: 34, lineHeight: 42, weight: '700', letterSpacing: -0.5, mt: 12, mb: 8 },
    '2': { fontSize: 28, lineHeight: 36, weight: '700', letterSpacing: -0.4, mt: 10, mb: 6 },
    '3': { fontSize: 24, lineHeight: 32, weight: '700', letterSpacing: -0.3, mt: 10, mb: 6 },
    '4': { fontSize: 20, lineHeight: 28, weight: '600', letterSpacing: -0.2, mt: 8, mb: 4 },
    '5': { fontSize: 17, lineHeight: 24, weight: '600', letterSpacing: 0, mt: 6, mb: 4 },
    '6': { fontSize: 15, lineHeight: 22, weight: '600', letterSpacing: 0, mt: 6, mb: 4 },
};

export function Title({ section, values }: IStyleProps): React.ReactElement {
    const order = readField<string>(section, 'title_order') ?? '2';
    const contentField = useInterpolatedField(section, 'content', values);
    const textField = useInterpolatedField(section, 'text', values);
    const content = contentField || textField;
    const colors = useAppColors();

    // `shared_color` (a Mantine palette name) drives the heading colour on both
    // platforms; resolve it to a concrete accent hex (lightened on dark for
    // contrast) and fall back to the themed body-text colour when unset.
    const sharedColor = readField<string>(section, 'shared_color');
    const color = sharedColor
        ? resolveMantineVariant('filled', sharedColor).accent ?? colors.text
        : colors.text;

    // `shared_line_clamp` truncates the heading to N lines (matches the web
    // `lineClamp`); empty = no clamp.
    const clampRaw = readField<string>(section, 'shared_line_clamp');
    const numberOfLines = clampRaw && /^\d+$/.test(clampRaw) ? Number(clampRaw) : undefined;

    const g = ORDER_TO_GEOMETRY[order] ?? ORDER_TO_GEOMETRY['2'];

    return (
        <Text
            className={buildSectionClasses(section)}
            numberOfLines={numberOfLines}
            style={{
                fontSize: g.fontSize,
                lineHeight: g.lineHeight,
                fontWeight: g.weight,
                letterSpacing: g.letterSpacing,
                color,
                marginTop: g.mt,
                marginBottom: g.mb,
            }}
        >
            {content}
        </Text>
    );
}
