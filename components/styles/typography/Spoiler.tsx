/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, useInterpolatedField } from '@/components/renderer/useField';
import { colorToHex } from '@selfhelp/shared';
import { useAppColors } from '@/hooks/useAppColors';

export function Spoiler({ section, values }: IStyleProps): React.ReactElement {
    const [open, setOpen] = useState(false);
    const showLabel = useInterpolatedField(section, 'spoiler_show_label', values) || 'Show';
    const hideLabel = useInterpolatedField(section, 'spoiler_hide_label', values) || 'Hide';
    const color = readField<string>(section, 'shared_color');
    const colors = useAppColors();
    const controlColor = color ? (colorToHex(color, colors.isDark ? 5 : 7) ?? colors.primary) : colors.primary;

    return (
        <View className={buildSectionClasses(section)}>
            <View style={open ? undefined : { maxHeight: 80, overflow: 'hidden' }}>
                <Children sections={(section as { children?: never }).children} values={values} />
            </View>
            <Pressable onPress={() => setOpen((v) => !v)} style={{ marginTop: 8 }}>
                <Text style={{ color: controlColor, fontWeight: '600' }}>{open ? hideLabel : showLabel}</Text>
            </Pressable>
        </View>
    );
}
