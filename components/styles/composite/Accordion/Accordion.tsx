/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Mantine Accordion equivalent, built on the HeroUI Native Accordion compound
 * (themed + animated). Child `accordion-item` sections render `Accordion.Item`
 * and consult the HeroUI accordion context automatically — no custom context
 * needed.
 *
 * Reads the cross-platform `shared_*` fields only (never `web_*`):
 *   - `shared_multiple`           -> selectionMode single | multiple
 *   - `shared_accordion_variant`  -> HeroUI variant default | surface (mapper)
 *   - `shared_radius`             -> container border radius (surface box)
 */

import { Accordion as HeroAccordion } from 'heroui-native';
import { mapAccordionVariantToHeroUiVariant, mapRadiusToPx } from '@selfhelp/shared';
import type { TSemanticRadius } from '@selfhelp/shared';

import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readBooleanField, readField } from '@/components/renderer/useField';

export function Accordion({ section, values }: IStyleProps): React.ReactElement {
    const multiple = readBooleanField(section, 'shared_multiple', false);
    const variant = mapAccordionVariantToHeroUiVariant(readField<string>(section, 'shared_accordion_variant'));
    const radiusPx = mapRadiusToPx(readField<string>(section, 'shared_radius') as TSemanticRadius | undefined);

    return (
        <HeroAccordion
            selectionMode={multiple ? 'multiple' : 'single'}
            variant={variant}
            className={buildSectionClasses(section)}
            {...(radiusPx !== undefined ? { styles: { container: { borderRadius: radiusPx } } } : {})}
        >
            <Children sections={(section as { children?: never }).children} values={values} />
        </HeroAccordion>
    );
}
