/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';

export function ListStyle({ section, values }: IStyleProps): React.ReactElement {
    return (
        <View className={buildSectionClasses(section)} style={{ paddingLeft: 16, marginVertical: 8 }}>
            <Children sections={(section as { children?: never }).children} values={values} />
        </View>
    );
}
