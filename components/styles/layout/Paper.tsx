/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Text, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField, useInterpolatedField } from '@/components/renderer/useField';
import { mobileStyleProps } from '@/components/ui/mobileStyleProps';
import { useAppColors } from '@/hooks/useAppColors';

const SHADOWS: Record<string, { offset: { width: number; height: number }; opacity: number; radius: number; elevation: number }> = {
    none: { offset: { width: 0, height: 0 }, opacity: 0, radius: 0, elevation: 0 },
    xs: { offset: { width: 0, height: 1 }, opacity: 0.05, radius: 1, elevation: 1 },
    sm: { offset: { width: 0, height: 2 }, opacity: 0.08, radius: 4, elevation: 2 },
    md: { offset: { width: 0, height: 4 }, opacity: 0.1, radius: 8, elevation: 4 },
    lg: { offset: { width: 0, height: 8 }, opacity: 0.12, radius: 14, elevation: 8 },
    xl: { offset: { width: 0, height: 12 }, opacity: 0.16, radius: 20, elevation: 12 },
};

export function Paper({ section, values }: IStyleProps): React.ReactElement {
    const colors = useAppColors();
    const resolved = mobileStyleProps(section);
    const shadow = readField<string>(section, 'web_paper_shadow') ?? 'none';
    const border = readBooleanField(section, 'shared_border', false);
    // Optional auto-styled heading: rendered only when filled (empty = a plain
    // surface). HTML-stripped to plain text by the shared interpolation hook.
    const title = useInterpolatedField(section, 'title', values);

    const s = SHADOWS[shadow] ?? SHADOWS.none;
    const borderRadius = resolved.radiusPx ?? 8;

    return (
        <View
            className={buildSectionClasses(section)}
            style={{
                backgroundColor: colors.surface,
                borderRadius,
                padding: 14,
                borderWidth: border ? 1 : 0,
                borderColor: colors.border,
                shadowColor: '#000',
                shadowOffset: s.offset,
                shadowOpacity: s.opacity,
                shadowRadius: s.radius,
                elevation: s.elevation,
            }}
        >
            {title ? (
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
                    {title}
                </Text>
            ) : null}
            <Children sections={(section as { children?: never }).children} values={values} />
        </View>
    );
}
