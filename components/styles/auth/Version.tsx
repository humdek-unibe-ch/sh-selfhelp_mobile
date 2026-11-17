/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * `version` style: the "about the platform" block.
 *
 * One card: title + product badge, a segmented control per non-empty group with
 * counts, a filter input, and rows with name, licence badge and version only
 * when `about.detail` is true. Rules and filtering live in `versionAbout.ts`
 * so `node --test` covers them. Colours come from the app palette; labels from
 * style fields. No request is made and no referrer is sent: apps have none.
 */
import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { useAppColors } from '@/hooks/useAppColors';
import appLibraries from '@/config/appLibraries.generated.json';
import { buildVersionAbout, filterAboutItems } from './versionAbout';

export function Version({ section }: IStyleProps): React.ReactElement | null {
    const colors = useAppColors();
    const model = useMemo(() => buildVersionAbout(section, appLibraries), [section]);
    const [activeKey, setActiveKey] = useState<string | null>(null);
    const [filter, setFilter] = useState('');

    if (!model) {
        return null;
    }

    const currentKey =
        activeKey && model.groups.some((group) => group.key === activeKey)
            ? activeKey
            : (model.groups[0]?.key ?? null);
    const activeGroup = model.groups.find((group) => group.key === currentKey) ?? null;
    const visibleItems = activeGroup ? filterAboutItems(activeGroup.items, filter) : [];

    return (
        <View
            className={buildSectionClasses(section)}
            style={{
                gap: 12,
                marginVertical: 8,
                padding: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
            }}
        >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
                {model.title ? (
                    <Text accessibilityRole="header" style={{ fontWeight: '700', fontSize: 20, color: colors.text, flexShrink: 1 }}>
                        {model.title}
                    </Text>
                ) : (
                    <View />
                )}
                <View
                    style={{
                        backgroundColor: colors.activeSurface,
                        borderRadius: 999,
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                    }}
                >
                    <Text style={{ fontWeight: '600', fontSize: 13, color: colors.primary }}>{model.product}</Text>
                </View>
            </View>

            {model.groups.length === 0 ? null : (
                <>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {model.groups.map((group) => {
                            const selected = group.key === currentKey;
                            const label = group.heading
                                ? `${group.heading} (${group.items.length})`
                                : `(${group.items.length})`;
                            return (
                                <Pressable
                                    key={group.key}
                                    accessibilityRole="button"
                                    accessibilityState={{ selected }}
                                    onPress={() => setActiveKey(group.key)}
                                    style={{
                                        paddingHorizontal: 12,
                                        paddingVertical: 8,
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: selected ? colors.primary : colors.border,
                                        backgroundColor: selected ? colors.activeSurface : colors.surface,
                                    }}
                                >
                                    <Text style={{ fontSize: 13, fontWeight: selected ? '700' : '500', color: colors.text }}>
                                        {label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    {model.filterLabel ? (
                        <TextInput
                            value={filter}
                            onChangeText={setFilter}
                            placeholder={model.filterLabel}
                            accessibilityLabel={model.filterLabel}
                            placeholderTextColor={colors.textFaint}
                            style={{
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderRadius: 8,
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                                color: colors.text,
                                backgroundColor: colors.surfaceMuted,
                            }}
                        />
                    ) : null}

                    {visibleItems.length === 0 ? (
                        model.noMatchLabel ? (
                            <Text style={{ fontSize: 14, color: colors.textMuted }}>{model.noMatchLabel}</Text>
                        ) : null
                    ) : (
                        <View style={{ gap: 8 }}>
                            {visibleItems.map((item, index) => (
                                <View
                                    key={`${item.name}-${index}`}
                                    accessible
                                    style={{
                                        flexDirection: 'row',
                                        flexWrap: 'wrap',
                                        alignItems: 'center',
                                        columnGap: 8,
                                        rowGap: 4,
                                        paddingVertical: 4,
                                        borderBottomWidth: index === visibleItems.length - 1 ? 0 : 1,
                                        borderBottomColor: colors.border,
                                    }}
                                >
                                    <Text style={{ fontSize: 14, color: colors.text, flexShrink: 1 }}>{item.name}</Text>
                                    {item.license ? (
                                        <View
                                            style={{
                                                backgroundColor: colors.surfaceMuted,
                                                borderRadius: 999,
                                                paddingHorizontal: 8,
                                                paddingVertical: 2,
                                            }}
                                        >
                                            <Text style={{ fontSize: 12, color: colors.textMuted }}>{item.license}</Text>
                                        </View>
                                    ) : null}
                                    {item.version ? (
                                        <Text style={{ fontSize: 13, fontFamily: 'monospace', color: colors.textFaint }}>
                                            {item.version}
                                        </Text>
                                    ) : null}
                                </View>
                            ))}
                        </View>
                    )}
                </>
            )}
        </View>
    );
}
