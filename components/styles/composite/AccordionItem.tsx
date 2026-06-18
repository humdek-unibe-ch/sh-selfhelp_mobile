/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Pressable, Text, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, useInterpolatedField } from '@/components/renderer/useField';
import { useAccordionContext } from './Accordion/index';

export function AccordionItem({ section, values }: IStyleProps): React.ReactElement {
    const ctx = useAccordionContext();
    const itemValue = readField<string>(section, 'mantine_accordion_item_value') ?? String(section.id);
    const label = useInterpolatedField(section, 'label', values);
    const isOpen = ctx?.open.has(itemValue) ?? false;

    return (
        <View className={buildSectionClasses(section)} style={{ borderTopWidth: 1, borderColor: '#e9ecef' }}>
            <Pressable
                onPress={() => ctx?.toggle(itemValue)}
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12 }}
            >
                <Text style={{ fontWeight: '600' }}>{label}</Text>
                <Text>{isOpen ? '▾' : '▸'}</Text>
            </Pressable>
            {isOpen ? (
                <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
                    <Children sections={(section as { children?: never }).children} values={values} />
                </View>
            ) : null}
        </View>
    );
}
