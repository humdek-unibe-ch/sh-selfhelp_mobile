/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { ScrollView } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField } from '@/components/renderer/useField';
import { parseDimensionToReactNative } from '@selfhelp/shared';

export function ScrollAreaStyle({ section, values }: IStyleProps): React.ReactElement {
    // `shared_height` bounds the scroll region (a ScrollView needs a fixed
    // height to scroll internally); when unset the list grows with the page.
    const height = parseDimensionToReactNative(readField<string>(section, 'shared_height'));
    return (
        <ScrollView
            className={buildSectionClasses(section)}
            style={{ height }}
        >
            <Children sections={(section as { children?: never }).children} values={values} />
        </ScrollView>
    );
}
