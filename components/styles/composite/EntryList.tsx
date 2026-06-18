/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';

/**
 * `entryList` is data-bound on the backend (it's hydrated with rows
 * from a form-log table before the page is sent to the client). We
 * render the children (one per row) — the backend already cloned the
 * template. Hydration happens in the backend `serveDraft/PublishedVersion`
 * code paths.
 */
export function EntryList({ section, values }: IStyleProps): React.ReactElement {
    return (
        <View className={buildSectionClasses(section)}>
            <Children sections={(section as { children?: never }).children} values={values} />
        </View>
    );
}
