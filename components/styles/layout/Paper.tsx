/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField } from '@/components/renderer/useField';
import { RADIUS_PX } from '@selfhelp/shared';
import type { TCanonicalRadius } from '@selfhelp/shared';

const SHADOWS: Record<string, { offset: { width: number; height: number }; opacity: number; radius: number; elevation: number }> = {
    none: { offset: { width: 0, height: 0 }, opacity: 0, radius: 0, elevation: 0 },
    xs: { offset: { width: 0, height: 1 }, opacity: 0.05, radius: 1, elevation: 1 },
    sm: { offset: { width: 0, height: 2 }, opacity: 0.08, radius: 4, elevation: 2 },
    md: { offset: { width: 0, height: 4 }, opacity: 0.1, radius: 8, elevation: 4 },
    lg: { offset: { width: 0, height: 8 }, opacity: 0.12, radius: 14, elevation: 8 },
    xl: { offset: { width: 0, height: 12 }, opacity: 0.16, radius: 20, elevation: 12 },
};

export function Paper({ section, values }: IStyleProps): React.ReactElement {
    const shadow = readField<string>(section, 'mantine_paper_shadow') ?? 'none';
    const radius = readField<string>(section, 'mantine_radius') ?? 'md';
    const border = readBooleanField(section, 'mantine_border', false);

    const s = SHADOWS[shadow] ?? SHADOWS.none;
    const borderRadius = RADIUS_PX[radius as TCanonicalRadius] ?? 8;

    return (
        <View
            className={buildSectionClasses(section)}
            style={{
                backgroundColor: '#ffffff',
                borderRadius,
                padding: 14,
                borderWidth: border ? 1 : 0,
                borderColor: '#e9ecef',
                shadowColor: '#000',
                shadowOffset: s.offset,
                shadowOpacity: s.opacity,
                shadowRadius: s.radius,
                elevation: s.elevation,
            }}
        >
            <Children sections={(section as { children?: never }).children} values={values} />
        </View>
    );
}
