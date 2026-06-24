/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Language picker rendered inside the account sheet (`AccountMenu`).
 *
 * Each row shows the locale code as a badge plus the full language name,
 * with a check on the active one — mirroring the web frontend's
 * `LanguageSelector` dropdown, but as a tappable list that fits a mobile
 * sheet instead of crowding the header.
 */

import { Pressable, Text, View } from 'react-native';

import { useLanguageStore } from '@/stores/languageStore';
import { useLanguages } from '@/hooks/useLanguages';
import { setLanguage } from '@/services/languageService';
import { useAppColors } from '@/hooks/useAppColors';

export function LanguageSwitcher(): React.ReactElement | null {
    useLanguages();
    const available = useLanguageStore((s) => s.available);
    const current = useLanguageStore((s) => s.locale);
    const colors = useAppColors();

    if (!available.length) return null;
    // Shown everywhere, INCLUDING the embedded CMS Live Preview — the in-app
    // picker mirrors the normal app so an editor can switch language from the
    // mobile profile too (the CMS toolbar's language control still works; last
    // action wins, both drive the same `setLanguage`).

    return (
        <View style={{ gap: 2 }}>
            {available.map((lang) => {
                const active = current === lang.locale;
                const code = lang.locale.split('-')[0]?.toUpperCase() ?? lang.locale;
                return (
                    <Pressable
                        key={lang.id}
                        onPress={() => {
                            void setLanguage(lang.id, lang.locale);
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={lang.language}
                        style={({ pressed }) => ({
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            borderRadius: 10,
                            backgroundColor: active
                                ? colors.activeSurface
                                : pressed
                                  ? colors.pressed
                                  : 'transparent',
                        })}
                    >
                        <View
                            style={{
                                width: 36,
                                height: 26,
                                borderRadius: 6,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: active ? colors.primary : colors.surfaceMuted,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 11,
                                    fontWeight: '700',
                                    color: active ? colors.onPrimary : colors.textMuted,
                                }}
                            >
                                {code}
                            </Text>
                        </View>
                        <Text
                            style={{
                                flex: 1,
                                fontSize: 15,
                                color: colors.text,
                                fontWeight: active ? '700' : '500',
                            }}
                        >
                            {lang.language}
                        </Text>
                        {active ? (
                            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '700' }}>
                                {'\u2713'}
                            </Text>
                        ) : null}
                    </Pressable>
                );
            })}
        </View>
    );
}
