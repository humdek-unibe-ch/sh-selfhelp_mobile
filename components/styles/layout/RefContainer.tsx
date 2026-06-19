/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * ref-container — renders content referenced from another section. The
 * referenced subtree is resolved server-side and arrives as `children`, so this
 * reuses the normal recursive `<Children>` renderer (no second renderer), per
 * the shared `IRefContainerStyle` contract.
 */
import { View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';

export function RefContainer({ section, values }: IStyleProps): React.ReactElement {
    return (
        <View className={buildSectionClasses(section)}>
            <Children sections={(section as { children?: never }).children} values={values} />
        </View>
    );
}
