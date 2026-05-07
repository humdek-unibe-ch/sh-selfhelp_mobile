/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { Children } from '@/components/renderer/Children';

/**
 * On the web, `html-tag` renders any HTML tag. On RN, every HTML tag
 * collapses to a generic View (block). The CMS uses this style mainly
 * for semantic wrappers (`<section>`, `<article>`); on mobile they're
 * functionally identical.
 */
export function HtmlTag({ section, values }: IStyleProps): React.ReactElement {
    return (
        <View className={buildSectionClasses(section)}>
            <Children sections={(section as { children?: never }).children as never} values={values} />
        </View>
    );
}
