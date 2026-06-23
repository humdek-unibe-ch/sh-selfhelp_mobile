/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Linking, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readBooleanField, readField, useInterpolatedField } from '@/components/renderer/useField';
import { colorToHex } from '@selfhelp/shared';
import { useAppColors } from '@/hooks/useAppColors';

export function Link({ section, values }: IStyleProps): React.ReactElement {
    const router = useRouter();
    const label = useInterpolatedField(section, 'label', values);
    const url = useInterpolatedField(section, 'url', values);
    const openInNewTab = readBooleanField(section, 'open_in_new_tab', false);
    // color is the cross-platform accent (same field the web Anchor uses);
    // fall back to the theme link/primary token, lightened on dark backgrounds.
    const color = readField<string>(section, 'color');
    const colors = useAppColors();
    const accent = color ? (colorToHex(color, colors.isDark ? 5 : 7) ?? colors.primary) : colors.primary;
    // web_link_underline is web-only; mobile keeps the link underlined.

    return (
        <Pressable
            className={buildSectionClasses(section)}
            onPress={() => {
                if (!url) return;
                if (openInNewTab || /^https?:\/\//.test(url)) void Linking.openURL(url);
                else router.push(url);
            }}
            accessibilityRole="link"
        >
            <Text
                style={{
                    color: accent,
                    fontWeight: '500',
                    textDecorationLine: 'underline',
                    textDecorationColor: accent,
                }}
            >
                {label}
            </Text>
        </Pressable>
    );
}
