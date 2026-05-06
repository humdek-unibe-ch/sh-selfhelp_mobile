import { Linking, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readBooleanField, useInterpolatedField } from '@/components/renderer/useField';

export function Link({ section, values }: IStyleProps): React.ReactElement {
    const router = useRouter();
    const label = useInterpolatedField(section, 'label', values);
    const url = useInterpolatedField(section, 'url', values);
    const openInNewTab = readBooleanField(section, 'open_in_new_tab', false);

    return (
        <Pressable
            className={buildSectionClasses(section)}
            onPress={() => {
                if (!url) return;
                if (openInNewTab || /^https?:\/\//.test(url)) void Linking.openURL(url);
                else router.push(url as never);
            }}
            accessibilityRole="link"
        >
            <Text
                style={{
                    color: '#1c7ed6',
                    fontWeight: '500',
                    textDecorationLine: 'underline',
                    textDecorationColor: '#a5d8ff',
                }}
            >
                {label}
            </Text>
        </Pressable>
    );
}
