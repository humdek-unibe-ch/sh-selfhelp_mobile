import { Linking, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField, useInterpolatedField } from '@/components/renderer/useField';
import { resolveMantineVariant } from '@/styles/mantineVariant';
import { RADIUS_PX } from '@selfhelp/shared';
import type { TCanonicalRadius, TMantineSize } from '@selfhelp/shared';

const SIZE_PX: Record<TMantineSize, { box: number; icon: number }> = {
    xs: { box: 24, icon: 12 },
    sm: { box: 28, icon: 14 },
    md: { box: 34, icon: 16 },
    lg: { box: 42, icon: 20 },
    xl: { box: 50, icon: 24 },
};

export function ActionIcon({ section, values }: IStyleProps): React.ReactElement {
    const router = useRouter();
    const variant = readField<string>(section, 'mantine_variant') ?? 'subtle';
    const color = readField<string>(section, 'mantine_color') ?? 'gray';
    const size = (readField<string>(section, 'mantine_size') as TMantineSize | undefined) ?? 'md';
    const radius = readField<string>(section, 'mantine_radius') ?? 'md';
    const icon = readField<string>(section, 'mantine_left_icon') ?? '?';
    const disabled = readBooleanField(section, 'disabled', false);
    const isLink = readBooleanField(section, 'is_link', false);
    const pageKeyword = useInterpolatedField(section, 'page_keyword', values);
    const openInNewTab = readBooleanField(section, 'open_in_new_tab', false);

    const dims = SIZE_PX[size] ?? SIZE_PX.md;
    const v = resolveMantineVariant(variant, color);

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
            className={buildSectionClasses(section)}
            style={({ pressed }) => ({
                width: dims.box,
                height: dims.box,
                borderRadius: RADIUS_PX[radius as TCanonicalRadius] ?? 8,
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
