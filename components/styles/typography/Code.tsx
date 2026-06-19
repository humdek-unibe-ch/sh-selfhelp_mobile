/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Text, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readBooleanField, useInterpolatedField } from '@/components/renderer/useField';
import { useAppColors } from '@/hooks/useAppColors';

export function Code({ section, values }: IStyleProps): React.ReactElement {
    const block = readBooleanField(section, 'web_code_block', false);
    const text = useInterpolatedField(section, 'content', values);
    const colors = useAppColors();
    if (block) {
        return (
            <View className={buildSectionClasses(section)} style={{ backgroundColor: colors.surfaceMuted, padding: 12, borderRadius: 4, marginVertical: 8 }}>
                <Text style={{ fontFamily: 'Courier', color: colors.text }}>{text}</Text>
            </View>
        );
    }
    return (
        <Text
            className={buildSectionClasses(section)}
            style={{ fontFamily: 'Courier', color: colors.text, backgroundColor: colors.surfaceMuted, paddingHorizontal: 4, borderRadius: 2 }}
        >
            {text}
        </Text>
    );
}
