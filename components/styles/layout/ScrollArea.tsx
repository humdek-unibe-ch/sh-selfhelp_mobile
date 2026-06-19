/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { ScrollView } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField } from '@/components/renderer/useField';

export function ScrollAreaStyle({ section, values }: IStyleProps): React.ReactElement {
    const height = readField<string>(section, 'web_height');
    const numericHeight = height ? Number(height) : undefined;
    return (
        <ScrollView
            className={buildSectionClasses(section)}
            style={{ height: Number.isFinite(numericHeight) ? numericHeight : undefined }}
        >
            <Children sections={(section as { children?: never }).children} values={values} />
        </ScrollView>
    );
}
