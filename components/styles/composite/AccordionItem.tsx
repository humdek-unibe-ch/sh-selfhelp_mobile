/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Single accordion row, rendered with the HeroUI Native Accordion compound
 * (`Accordion.Item` / `.Trigger` / `.Indicator` / `.Content`). It relies on the
 * HeroUI accordion context provided by the parent `accordion` style, so it does
 * not manage open/closed state itself.
 *
 * Theme-aware colours come from `useAppColors()` (no hard-coded hexes). Reads
 * only cross-platform content fields: `label` and the optional `description`
 * subtitle. The web-only icon / value fields are intentionally not read here.
 */

import { Accordion as HeroAccordion } from 'heroui-native';
import { Text, View } from 'react-native';

import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readBooleanField, useInterpolatedField } from '@/components/renderer/useField';
import { useAppColors } from '@/hooks/useAppColors';

export function AccordionItem({ section, values }: IStyleProps): React.ReactElement {
    const colors = useAppColors();
    const label = useInterpolatedField(section, 'label', values);
    const description = useInterpolatedField(section, 'description', values);
    const disabled = readBooleanField(section, 'disabled', false);

    return (
        <HeroAccordion.Item
            value={String(section.id)}
            isDisabled={disabled}
            className={buildSectionClasses(section)}
        >
            <HeroAccordion.Trigger>
                <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '500' }}>
                        {label || `Item ${section.id}`}
                    </Text>
                    {description ? (
                        <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>
                            {description}
                        </Text>
                    ) : null}
                </View>
                <HeroAccordion.Indicator />
            </HeroAccordion.Trigger>
            <HeroAccordion.Content>
                <Children sections={(section as { children?: never }).children} values={values} />
            </HeroAccordion.Content>
        </HeroAccordion.Item>
    );
}
