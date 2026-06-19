/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Text, View } from 'react-native';
import { RADIUS_PX } from '@selfhelp/shared';
import type { TCanonicalRadius } from '@selfhelp/shared';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField, useInterpolatedField } from '@/components/renderer/useField';
import { useAppColors } from '@/hooks/useAppColors';

export function Code({ section, values }: IStyleProps): React.ReactElement {
    const block = readBooleanField(section, 'code_block', false);
    const text = useInterpolatedField(section, 'content', values);
    const colors = useAppColors();
    // `shared_radius` rounds the code surface (block mode); empty falls back to a
    // subtle default that matches the web renderer.
    const radius = readField<string>(section, 'shared_radius');
    const radiusPx = radius ? RADIUS_PX[radius as TCanonicalRadius] ?? 4 : 4;
    if (block) {
        return (
            <View className={buildSectionClasses(section)} style={{ backgroundColor: colors.surfaceMuted, padding: 12, borderRadius: radiusPx, marginVertical: 8 }}>
                <Text style={{ fontFamily: 'Courier', color: colors.text }}>{text}</Text>
            </View>
        );
    }
    return (
        <Text
            className={buildSectionClasses(section)}
            style={{ fontFamily: 'Courier', color: colors.text, backgroundColor: colors.surfaceMuted, paddingHorizontal: 4, borderRadius: Math.min(radiusPx, 4) }}
        >
            {text}
        </Text>
    );
}
