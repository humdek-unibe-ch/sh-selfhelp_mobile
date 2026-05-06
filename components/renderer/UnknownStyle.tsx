/**
 * Fallback for any `style_name` that isn't yet registered on mobile.
 * Renders a discreet warning in dev and an empty `<View>` in production
 * so the rest of the page keeps rendering.
 */

import { Text, View } from 'react-native';

import type { IStyleProps } from './types';

export function UnknownStyle({ section }: IStyleProps): React.ReactElement | null {
    if (!__DEV__) return null;
    return (
        <View
            style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: '#fab005',
                backgroundColor: '#fff9db',
                marginVertical: 4,
            }}
        >
            <Text style={{ color: '#856404', fontWeight: '600' }}>Unknown style: {String(section.style_name)}</Text>
            <Text style={{ color: '#856404', marginTop: 2 }}>Section #{section.id}</Text>
        </View>
    );
}
