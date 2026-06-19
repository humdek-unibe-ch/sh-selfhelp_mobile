/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField } from '@/components/renderer/useField';
import { CONTAINER_SIZE_PX } from '@selfhelp/shared';
import type { TMantineSize } from '@selfhelp/shared';

export function Container({ section, values }: IStyleProps): React.ReactElement {
    const size = readField<TMantineSize>(section, 'shared_size') ?? 'md';
    const fluid = readBooleanField(section, 'web_fluid', false);
    const maxWidth = fluid ? undefined : CONTAINER_SIZE_PX[size] ?? CONTAINER_SIZE_PX.md;

    return (
        <View
            className={buildSectionClasses(section)}
            style={{ width: '100%', alignSelf: 'center', maxWidth, paddingHorizontal: 16 }}
        >
            <Children sections={(section as { children?: never }).children} values={values} />
        </View>
    );
}
