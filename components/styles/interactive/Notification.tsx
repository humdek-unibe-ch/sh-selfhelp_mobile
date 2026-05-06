import { Text, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, useInterpolatedField } from '@/components/renderer/useField';
import { colorToHex, RADIUS_PX } from '@selfhelp/shared';
import type { TCanonicalRadius } from '@selfhelp/shared';

export function Notification({ section, values }: IStyleProps): React.ReactElement {
    const title = useInterpolatedField(section, 'title', values);
    const content = useInterpolatedField(section, 'content', values);
    const color = readField<string>(section, 'mantine_color') ?? 'blue';
    const radius = readField<string>(section, 'mantine_radius') ?? 'sm';
    const accent = colorToHex(color, 6) ?? '#228be6';

    return (
        <View
            className={buildSectionClasses(section)}
            style={{
                backgroundColor: '#fff',
                padding: 12,
                borderRadius: RADIUS_PX[radius as TCanonicalRadius] ?? 4,
                borderLeftWidth: 4,
                borderLeftColor: accent,
                shadowColor: '#000',
                shadowOpacity: 0.06,
                shadowOffset: { width: 0, height: 2 },
                shadowRadius: 4,
                elevation: 2,
                marginVertical: 6,
            }}
        >
            {title ? <Text style={{ fontWeight: '600', marginBottom: 4 }}>{title}</Text> : null}
            {content ? <Text style={{ color: '#495057' }}>{content}</Text> : null}
        </View>
    );
}
