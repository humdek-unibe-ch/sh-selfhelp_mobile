/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField } from '@/components/renderer/useField';

export function AspectRatio({ section, values }: IStyleProps): React.ReactElement {
    const ratioStr = readField<string>(section, 'web_aspect_ratio') ?? '16/9';
    const [w, h] = ratioStr.split('/').map((p) => Number(p.trim()));
    const ratio = Number.isFinite(w) && Number.isFinite(h) && h !== 0 ? w / h : 16 / 9;
    return (
        <View className={buildSectionClasses(section)} style={{ aspectRatio: ratio, width: '100%' }}>
            <Children sections={(section as { children?: never }).children} values={values} />
        </View>
    );
}
