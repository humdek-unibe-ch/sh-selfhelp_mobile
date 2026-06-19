/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Text, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { useInterpolatedField } from '@/components/renderer/useField';
import { FONT_SIZE_PX } from '@selfhelp/shared';
import { mobileStyleProps, mobileIntentPalette } from '@/components/ui/mobileStyleProps';

const SIZE_PADDING: Record<'sm' | 'md' | 'lg', { px: number; py: number; fs: number }> = {
    sm: { px: 8, py: 2, fs: (FONT_SIZE_PX.xs ?? 12) },
    md: { px: 10, py: 3, fs: (FONT_SIZE_PX.sm ?? 14) },
    lg: { px: 12, py: 4, fs: (FONT_SIZE_PX.md ?? 16) },
};

/**
 * Badge — HeroUI Native OSS has no Badge primitive, so this is the OSS fallback:
 * a compact status pill rendered with React Native, but driven entirely by the
 * shared semantic field model (`intent` -> color, `size`, `radius`) through the
 * shared mapper. `mobile_*` overrides would slot in here for native-only tweaks.
 *
 * HeroUI Native **Pro** override (RF-25): `Badge`. The Pro mobile build
 * (`@selfhelp/mobile-pro-ui`) swaps in the real component via the adapter seam;
 * the OSS build keeps this fallback. Same CMS fields either way.
 */
export function Badge({ section, values }: IStyleProps): React.ReactElement {
    const label = useInterpolatedField(section, 'label', values);
    const resolved = mobileStyleProps(section);
    const { palette, variant } = mobileIntentPalette(section, 'light');
    const size = resolved.size ?? 'sm';
    const padding = SIZE_PADDING[size];
    const radius = resolved.radiusPx ?? 9999;

    return (
        <View
            accessibilityRole="text"
            accessibilityLabel={label}
            className={buildSectionClasses(section)}
            style={{
                backgroundColor: palette.background,
                borderColor: palette.border,
                borderWidth: palette.borderWidth,
                paddingHorizontal: padding.px,
                paddingVertical: padding.py,
                borderRadius: radius,
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
            }}
        >
            {variant === 'dot' ? (
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: palette.accent }} />
            ) : null}
            <Text
                style={{
                    color: palette.foreground,
                    fontSize: padding.fs - 2,
                    fontWeight: '700',
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                }}
            >
                {label}
            </Text>
        </View>
    );
}
