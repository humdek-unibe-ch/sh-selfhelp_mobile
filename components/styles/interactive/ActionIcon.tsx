/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Linking, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField, useInterpolatedField } from '@/components/renderer/useField';
import type { TMantineSize } from '@selfhelp/shared';
import { mobileStyleProps, mobileIntentPalette } from '@/components/ui/mobileStyleProps';

const SIZE_PX: Record<TMantineSize, { box: number; icon: number }> = {
    xs: { box: 24, icon: 12 },
    sm: { box: 28, icon: 14 },
    md: { box: 34, icon: 16 },
    lg: { box: 42, icon: 20 },
    xl: { box: 50, icon: 24 },
};

export function ActionIcon({ section, values }: IStyleProps): React.ReactElement {
    const router = useRouter();
    const resolved = mobileStyleProps(section);
    const { palette: v } = mobileIntentPalette(section, 'subtle');
    const size = (readField<string>(section, 'size') as TMantineSize | undefined) ?? 'md';
    const icon = readField<string>(section, 'left_icon') ?? readField<string>(section, 'web_left_icon') ?? '?';
    const disabled = resolved.isDisabled ?? readBooleanField(section, 'disabled', false);
    const isLink = readBooleanField(section, 'is_link', false);
    const pageKeyword = useInterpolatedField(section, 'page_keyword', values);
    const openInNewTab = readBooleanField(section, 'open_in_new_tab', false);
    const ariaLabel = useInterpolatedField(section, 'aria_label', values) || undefined;

    const dims = SIZE_PX[size] ?? SIZE_PX.md;

    return (
        <Pressable
            disabled={disabled}
            onPress={() => {
                if (!isLink || disabled) return;
                if (pageKeyword) {
                    router.push(`/${pageKeyword}`);
                    return;
                }
                if (openInNewTab && pageKeyword) void Linking.openURL(pageKeyword);
            }}
            accessibilityRole="button"
            accessibilityLabel={ariaLabel}
            className={buildSectionClasses(section)}
            style={({ pressed }) => ({
                width: dims.box,
                height: dims.box,
                borderRadius: resolved.radiusPx ?? 8,
                backgroundColor: pressed && !disabled ? v.pressedBackground : v.background,
                borderWidth: v.borderWidth,
                borderColor: v.border,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: disabled ? 0.4 : 1,
            })}
        >
            <Text style={{ color: v.foreground, fontSize: dims.icon, fontWeight: '600' }}>{icon}</Text>
        </Pressable>
    );
}
