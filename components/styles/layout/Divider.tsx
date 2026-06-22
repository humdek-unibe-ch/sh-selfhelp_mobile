/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Text, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, useInterpolatedField } from '@/components/renderer/useField';
import { colorToHex, mapDividerVariantToReactNative } from '@selfhelp/shared';
import { useAppColors } from '@/hooks/useAppColors';

export function Divider({ section, values }: IStyleProps): React.ReactElement {
    const colors = useAppColors();
    const orientation = readField<string>(section, 'shared_orientation') ?? 'horizontal';
    const color = readField<string>(section, 'shared_color') ?? 'gray';
    const variant = readField<string>(section, 'shared_divider_variant') ?? 'solid';
    const label = useInterpolatedField(section, 'divider_label', values);
    const labelPosition = readField<string>(section, 'shared_divider_label_position') ?? 'center';

    const lineColor = colorToHex(color, colors.isDark ? 5 : 4) ?? colors.border;
    const lineStyle = mapDividerVariantToReactNative(variant);

    if (orientation === 'vertical') {
        return (
            <View
                className={buildSectionClasses(section)}
                style={{ width: 1, alignSelf: 'stretch', borderLeftWidth: 1, borderColor: lineColor, borderStyle: lineStyle }}
            />
        );
    }

    if (label) {
        const flexBefore = labelPosition === 'left' ? 0 : 1;
        const flexAfter = labelPosition === 'right' ? 0 : 1;
        return (
            <View className={buildSectionClasses(section)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: flexBefore, height: 1, borderTopWidth: 1, borderColor: lineColor, borderStyle: lineStyle }} />
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{label}</Text>
                <View style={{ flex: flexAfter, height: 1, borderTopWidth: 1, borderColor: lineColor, borderStyle: lineStyle }} />
            </View>
        );
    }

    return (
        <View
            className={buildSectionClasses(section)}
            style={{ height: 1, alignSelf: 'stretch', borderTopWidth: 1, borderColor: lineColor, borderStyle: lineStyle }}
        />
    );
}
