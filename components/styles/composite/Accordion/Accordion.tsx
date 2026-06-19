/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Mantine Accordion equivalent.
 *
 * Children are `accordion-item` sections; each one consults
 * `useAccordionContext()` to decide whether to render its body.
 */

import { View } from 'react-native';

import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readBooleanField } from '@/components/renderer/useField';

import { AccordionContext, useAccordionState } from './Accordion.hooks';

export function Accordion({ section, values }: IStyleProps): React.ReactElement {
    const multiple = readBooleanField(section, 'shared_multiple', false);
    const ctx = useAccordionState(multiple);

    return (
        <View className={buildSectionClasses(section)}>
            <AccordionContext.Provider value={ctx}>
                <Children sections={(section as { children?: never }).children} values={values} />
            </AccordionContext.Provider>
        </View>
    );
}
