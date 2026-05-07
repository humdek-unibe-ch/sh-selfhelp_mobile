/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { TextInput as RNTextInput, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField, useInterpolatedField } from '@/components/renderer/useField';
import { useFieldBinding } from './_useFieldBinding';
import { FieldShell } from './_FieldShell';

export function ColorInput({ section, values }: IStyleProps): React.ReactElement {
    const name = readField<string>(section, 'name') ?? '';
    const label = useInterpolatedField(section, 'label', values);
    const placeholder = useInterpolatedField(section, 'placeholder', values) || '#228be6';
    const required = readBooleanField(section, 'is_required', false);
    const initial = readField<string>(section, 'value') ?? '';
    const { value, error, setValue } = useFieldBinding(name, initial);

    return (
        <FieldShell label={label} required={required} error={error} className={buildSectionClasses(section)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: error ? '#fa5252' : '#dee2e6', borderRadius: 4 }}>
                <View style={{ width: 32, height: 32, backgroundColor: value || '#fff', borderRightWidth: 1, borderColor: '#dee2e6', borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }} />
                <RNTextInput
                    value={value}
                    onChangeText={setValue}
                    placeholder={placeholder}
                    autoCapitalize="characters"
                    style={{ flex: 1, padding: 10 }}
                />
            </View>
        </FieldShell>
    );
}
