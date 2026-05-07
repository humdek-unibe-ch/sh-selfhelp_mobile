/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Text, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readNumberField, useInterpolatedField } from '@/components/renderer/useField';
import { useFieldBinding } from './_useFieldBinding';
import { FieldShell } from './_FieldShell';

/**
 * Mobile slider — placeholder using a numeric text input. Swap to
 * `@react-native-community/slider` when the dep is added.
 */
export function Slider({ section, values }: IStyleProps): React.ReactElement {
    const name = readField<string>(section, 'name') ?? '';
    const label = useInterpolatedField(section, 'label', values);
    const description = useInterpolatedField(section, 'description', values);
    const min = readNumberField(section, 'mantine_numeric_min', 0) ?? 0;
    const max = readNumberField(section, 'mantine_numeric_max', 100) ?? 100;
    const initial = readField<string>(section, 'value') ?? String(min);
    const { value, error } = useFieldBinding(name, initial);

    return (
        <FieldShell label={label} description={description} error={error} className={buildSectionClasses(section)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ color: '#868e96' }}>{min}</Text>
                <View style={{ flex: 1, height: 4, backgroundColor: '#dee2e6', borderRadius: 2 }}>
                    <View
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: `${((Number(value) - min) / (max - min)) * 100}%`,
                            backgroundColor: '#228be6',
                            borderRadius: 2,
                        }}
                    />
                </View>
                <Text style={{ color: '#868e96' }}>{max}</Text>
                <Text style={{ marginLeft: 8 }}>{value}</Text>
            </View>
        </FieldShell>
    );
}
