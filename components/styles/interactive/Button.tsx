/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Linking, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField, useInterpolatedField } from '@/components/renderer/useField';
import { resolveMantineVariant } from '@/styles/mantineVariant';
import { FONT_SIZE_PX, RADIUS_PX } from '@selfhelp/shared';
import type { TCanonicalRadius, TMantineSize } from '@selfhelp/shared';

const SIZE_GEOMETRY: Record<TMantineSize, { px: number; py: number; minH: number; gap: number }> = {
    xs: { px: 12, py: 6, minH: 30, gap: 4 },
    sm: { px: 14, py: 8, minH: 36, gap: 6 },
    md: { px: 18, py: 10, minH: 42, gap: 6 },
    lg: { px: 22, py: 12, minH: 50, gap: 8 },
    xl: { px: 26, py: 14, minH: 60, gap: 8 },
};

export function Button({ section, values }: IStyleProps): React.ReactElement {
    const router = useRouter();
    const label = useInterpolatedField(section, 'label', values);
    const variant = readField<string>(section, 'mantine_variant') ?? 'filled';
    const color = readField<string>(section, 'mantine_color') ?? 'blue';
    const size = (readField<string>(section, 'mantine_size') as TMantineSize | undefined) ?? 'md';
    const radius = readField<string>(section, 'mantine_radius') ?? 'md';
    const fullWidth = readBooleanField(section, 'mantine_fullwidth', false);
    const disabled = readBooleanField(section, 'disabled', false);
    const isLink = readBooleanField(section, 'is_link', true);
    const url = useInterpolatedField(section, 'url', values);
    const pageKeyword = useInterpolatedField(section, 'page_keyword', values);
    const openInNewTab = readBooleanField(section, 'open_in_new_tab', false);

    const geom = SIZE_GEOMETRY[size] ?? SIZE_GEOMETRY.md;
    const v = resolveMantineVariant(variant, color);
    const borderRadius = RADIUS_PX[radius as TCanonicalRadius] ?? 8;

    const onPress = (): void => {
        if (!isLink || disabled) return;
        if (pageKeyword) {
            router.push(`/${pageKeyword}`);
            return;
        }
        if (url) {
            if (openInNewTab) void Linking.openURL(url);
            else router.push(url);
        }
    };

    return (
        <Pressable
            disabled={disabled}
            onPress={onPress}
            accessibilityRole="button"
            className={buildSectionClasses(section)}
            style={({ pressed }) => ({
                paddingHorizontal: geom.px,
                paddingVertical: geom.py,
                minHeight: geom.minH,
                borderRadius,
                backgroundColor: pressed && !disabled ? v.pressedBackground : v.background,
                borderWidth: v.borderWidth,
                borderColor: v.border,
                opacity: disabled ? 0.55 : 1,
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: fullWidth ? 'stretch' : 'flex-start',
                marginVertical: 4,
                shadowColor: v.background === 'transparent' ? 'transparent' : '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: variant === 'filled' && !disabled ? 0.08 : 0,
                shadowRadius: 2,
                elevation: variant === 'filled' && !disabled ? 1 : 0,
            })}
        >
            <Text
                numberOfLines={1}
                style={{
                    color: v.foreground,
                    fontSize: FONT_SIZE_PX[size] ?? 16,
                    fontWeight: '600',
                    letterSpacing: 0.1,
                }}
            >
                {label}
            </Text>
        </Pressable>
    );
}
