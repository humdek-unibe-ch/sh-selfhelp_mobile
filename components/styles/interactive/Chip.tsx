import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField, useInterpolatedField } from '@/components/renderer/useField';
import { COLOR_SCALES, RADIUS_PX } from '@selfhelp/shared';
import type { TCanonicalColor, TCanonicalRadius } from '@selfhelp/shared';

export function Chip({ section, values }: IStyleProps): React.ReactElement {
    const label = useInterpolatedField(section, 'label', values);
    const color = readField<string>(section, 'mantine_color') ?? 'blue';
    const radius = readField<string>(section, 'mantine_radius') ?? 'xl';
    const initiallyChecked =
        readBooleanField(section, 'mantine_chip_checked', false) ||
        readBooleanField(section, 'chip_checked', false);
    const disabled = readBooleanField(section, 'disabled', false);
    const [checked, setChecked] = useState(initiallyChecked);

    const palette = COLOR_SCALES[color as TCanonicalColor] ?? COLOR_SCALES.blue;

    return (
        <Pressable
            disabled={disabled}
            onPress={() => setChecked((c) => !c)}
            className={buildSectionClasses(section)}
            style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: RADIUS_PX[radius as TCanonicalRadius] ?? 999,
                borderWidth: 1,
                borderColor: checked ? palette[6] : '#dee2e6',
                backgroundColor: checked ? palette[0] : '#ffffff',
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                opacity: disabled ? 0.5 : 1,
            }}
        >
            {checked ? (
                <View
                    style={{
                        width: 14,
                        height: 14,
                        borderRadius: 7,
                        backgroundColor: palette[6],
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>✓</Text>
                </View>
            ) : null}
            <Text style={{ color: checked ? palette[8] : '#495057', fontWeight: '600' }}>{label}</Text>
        </Pressable>
    );
}
