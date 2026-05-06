import { Text, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField } from '@/components/renderer/useField';
import { colorToHex, RADIUS_PX } from '@selfhelp/shared';
import type { TCanonicalRadius, TMantineSize } from '@selfhelp/shared';

const SIZE_PX: Record<TMantineSize, number> = { xs: 16, sm: 20, md: 28, lg: 36, xl: 48 };

export function ThemeIcon({ section }: IStyleProps): React.ReactElement {
    const variant = readField<string>(section, 'mantine_variant') ?? 'filled';
    const color = readField<string>(section, 'mantine_color') ?? 'blue';
    const size = (readField<string>(section, 'mantine_size') as TMantineSize | undefined) ?? 'md';
    const radius = readField<string>(section, 'mantine_radius') ?? 'sm';
    const icon = readField<string>(section, 'mantine_left_icon') ?? '★';

    const dim = SIZE_PX[size] ?? 28;
    const accent = colorToHex(color, 6) ?? '#228be6';
    const isFilled = variant === 'filled';

    return (
        <View
            className={buildSectionClasses(section)}
            style={{
                width: dim,
                height: dim,
                borderRadius: RADIUS_PX[radius as TCanonicalRadius] ?? 4,
                backgroundColor: isFilled ? accent : `${accent}22`,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Text style={{ color: isFilled ? '#fff' : accent, fontSize: dim * 0.55 }}>{icon}</Text>
        </View>
    );
}
