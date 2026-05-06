import { Text, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, useInterpolatedField } from '@/components/renderer/useField';
import { resolveMantineVariant } from '@/styles/mantineVariant';
import { FONT_SIZE_PX, RADIUS_PX } from '@selfhelp/shared';
import type { TCanonicalRadius, TMantineSize } from '@selfhelp/shared';

const SIZE_PADDING: Record<TMantineSize, { px: number; py: number }> = {
    xs: { px: 8, py: 2 },
    sm: { px: 10, py: 3 },
    md: { px: 12, py: 4 },
    lg: { px: 14, py: 5 },
    xl: { px: 16, py: 6 },
};

export function Badge({ section, values }: IStyleProps): React.ReactElement {
    const label = useInterpolatedField(section, 'label', values);
    const variant = readField<string>(section, 'mantine_variant') ?? 'light';
    const color = readField<string>(section, 'mantine_color') ?? 'blue';
    const size = (readField<string>(section, 'mantine_size') as TMantineSize | undefined) ?? 'sm';
    const radius = readField<string>(section, 'mantine_radius') ?? 'xl';

    const v = resolveMantineVariant(variant, color);
    const padding = SIZE_PADDING[size] ?? SIZE_PADDING.sm;

    return (
        <View
            className={buildSectionClasses(section)}
            style={{
                backgroundColor: v.background,
                borderColor: v.border,
                borderWidth: v.borderWidth,
                paddingHorizontal: padding.px,
                paddingVertical: padding.py,
                borderRadius: RADIUS_PX[radius as TCanonicalRadius] ?? 999,
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
            }}
        >
            {variant === 'dot' ? (
                <View
                    style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: v.accent,
                    }}
                />
            ) : null}
            <Text
                style={{
                    color: v.foreground,
                    fontSize: (FONT_SIZE_PX[size] ?? 14) - 2,
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
