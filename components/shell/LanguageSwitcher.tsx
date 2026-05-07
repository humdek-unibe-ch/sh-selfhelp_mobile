/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Inline language picker. The compact variant fits inside the header,
 * the default one is suitable for the drawer.
 */

import { Pressable, Text, View } from 'react-native';

import { useLanguageStore } from '@/stores/languageStore';
import { useLanguages } from '@/hooks/useLanguages';
import { setLanguage } from '@/services/languageService';

interface ILanguageSwitcherProps {
    compact?: boolean;
}

export function LanguageSwitcher({ compact = false }: ILanguageSwitcherProps): React.ReactElement | null {
    useLanguages();
    const available = useLanguageStore((s) => s.available);
    const current = useLanguageStore((s) => s.locale);

    if (!available.length) return null;

    if (compact) {
        return (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {available.map((lang) => {
                    const active = current === lang.locale;
                    const code = lang.locale.split('-')[0]?.toUpperCase() ?? lang.locale;
                    return (
                        <Pressable
                            key={lang.id}
                            onPress={() => {
                                void setLanguage(lang.id, lang.locale);
                            }}
                            style={{
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                marginLeft: 4,
                                borderRadius: 4,
                                backgroundColor: active ? '#228be6' : 'transparent',
                            }}
                        >
                            <Text style={{ color: active ? '#fff' : '#495057', fontSize: 11, fontWeight: '600' }}>{code}</Text>
                        </Pressable>
                    );
                })}
            </View>
        );
    }

    return (
        <View style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
            <Text style={{ fontSize: 12, color: '#868e96', marginBottom: 6 }}>Language</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {available.map((lang) => {
                    const active = current === lang.locale;
                    return (
                        <Pressable
                            key={lang.id}
                            onPress={() => {
                                void setLanguage(lang.id, lang.locale);
                            }}
                            style={{
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderRadius: 4,
                                marginRight: 6,
                                marginBottom: 6,
                                backgroundColor: active ? '#228be6' : '#f1f3f5',
                            }}
                        >
                            <Text style={{ color: active ? '#fff' : '#495057', fontSize: 12 }}>{lang.locale}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}
