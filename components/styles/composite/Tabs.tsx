/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { colorToHex, replaceCalcedValues } from '@selfhelp/shared';
import type { IPageSectionWithFields } from '@selfhelp/shared';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readStringField } from '@/components/renderer/useField';
import { stripHtmlToText } from '@/components/renderer/sanitizeContent';
import { useAppColors } from '@/hooks/useAppColors';

/**
 * Tabs — owns the whole tab interface: a horizontal strip of tab labels on top
 * and the active tab's content full-width below. The FIRST child `tab` is
 * selected by default (matching the web `TabsStyle`, which sets
 * `defaultValue = firstTab.id`); previously the active index defaulted to `0`
 * while tabs were keyed by their CMS `position` (e.g. 10, 20, …), so no tab was
 * ever selected and no content showed.
 *
 * Reads the tab panels directly from `section.children` instead of routing the
 * `tab` children through the registry, so the labels live in the strip while the
 * content lives in one full-width panel. The active accent honours `shared_color`.
 */
function tabLabel(tab: IPageSectionWithFields, values: Record<string, unknown>, index: number): string {
    const raw = readStringField(tab, 'label', '');
    const text = stripHtmlToText(
        replaceCalcedValues(raw, values as Record<string, string | number | boolean | null | undefined>)
    );
    return text || `Tab ${index + 1}`;
}

export function Tabs({ section, values }: IStyleProps): React.ReactElement {
    const colors = useAppColors();
    const accent = colorToHex(readStringField(section, 'shared_color', '')) || colors.primary;
    const tabs = useMemo(
        () =>
            ((section as { children?: IPageSectionWithFields[] }).children ?? []).filter(
                (c) => c?.style_name === 'tab'
            ),
        [section]
    );
    const [activeId, setActiveId] = useState<number | undefined>(tabs[0]?.id);
    const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

    return (
        <View className={buildSectionClasses(section)}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0 }}
                contentContainerStyle={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.border }}
            >
                {tabs.map((tab, i) => {
                    const isActive = tab.id === active?.id;
                    return (
                        <Pressable
                            key={tab.id}
                            onPress={() => setActiveId(tab.id)}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: isActive }}
                            style={{
                                paddingHorizontal: 14,
                                paddingVertical: 10,
                                borderBottomWidth: 2,
                                borderColor: isActive ? accent : 'transparent',
                            }}
                        >
                            <Text style={{ color: isActive ? accent : colors.textMuted, fontWeight: isActive ? '600' : '400' }}>
                                {tabLabel(tab, values, i)}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
            <View style={{ paddingVertical: 12 }}>
                {active ? <Children sections={active.children} values={values} /> : null}
            </View>
        </View>
    );
}
