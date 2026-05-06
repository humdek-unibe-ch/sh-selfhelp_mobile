import { Image, Text, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, useInterpolatedField } from '@/components/renderer/useField';
import { resolveAssetUrl } from '@selfhelp/shared';
import type { TMantineSize } from '@selfhelp/shared';
import { useServerStore } from '@/stores/serverStore';

const SIZE_PX: Record<TMantineSize, number> = { xs: 24, sm: 32, md: 40, lg: 56, xl: 80 };

export function Avatar({ section, values }: IStyleProps): React.ReactElement {
    const baseUrl = useServerStore((s) => s.serverUrl) ?? '';
    const src = useInterpolatedField(section, 'img_src', values);
    const initials = useInterpolatedField(section, 'mantine_avatar_initials', values);
    const size = (readField<string>(section, 'mantine_size') as TMantineSize | undefined) ?? 'md';
    const dim = SIZE_PX[size] ?? 40;

    if (src) {
        return (
            <Image
                source={{ uri: resolveAssetUrl(src, baseUrl) }}
                className={buildSectionClasses(section)}
                style={{ width: dim, height: dim, borderRadius: dim / 2, backgroundColor: '#e9ecef' }}
            />
        );
    }
    return (
        <View
            className={buildSectionClasses(section)}
            style={{
                width: dim,
                height: dim,
                borderRadius: dim / 2,
                backgroundColor: '#e9ecef',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Text style={{ color: '#495057', fontWeight: '600' }}>{(initials || '?').slice(0, 2).toUpperCase()}</Text>
        </View>
    );
}
