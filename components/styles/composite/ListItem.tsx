/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Text, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { useInterpolatedField } from '@/components/renderer/useField';
import { useAppColors } from '@/hooks/useAppColors';

export function ListItem({ section, values }: IStyleProps): React.ReactElement {
    const content = useInterpolatedField(section, 'list_item_content', values);
    const colors = useAppColors();
    return (
        <View className={buildSectionClasses(section)} style={{ flexDirection: 'row', marginVertical: 2 }}>
            <Text style={{ marginRight: 8, color: colors.textFaint }}>•</Text>
            <View style={{ flex: 1 }}>
                {content ? <Text style={{ color: colors.text }}>{content}</Text> : null}
                <Children sections={(section as { children?: never }).children} values={values} />
            </View>
        </View>
    );
}
