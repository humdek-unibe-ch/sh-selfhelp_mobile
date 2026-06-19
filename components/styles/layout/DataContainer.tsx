/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * data-container — a data-scoped container. The backend resolves the `scope`
 * data context and interpolates the subtree's `{{field}}` values server-side;
 * the mobile renderer renders the resolved subtree through the normal recursive
 * `<Children>` renderer (mirrors the backend data-container behavior, no second
 * renderer), per the shared `IDataContainerStyle` contract.
 */
import { View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';

export function DataContainer({ section, values }: IStyleProps): React.ReactElement {
    return (
        <View className={buildSectionClasses(section)}>
            <Children sections={(section as { children?: never }).children} values={values} />
        </View>
    );
}
