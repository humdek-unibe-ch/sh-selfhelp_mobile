import { TextInput as RNTextInput } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField, useInterpolatedField } from '@/components/renderer/useField';
import { useFieldBinding } from './_useFieldBinding';
import { FieldShell } from './_FieldShell';

export function NumberInput({ section, values }: IStyleProps): React.ReactElement {
    const name = readField<string>(section, 'name') ?? '';
    const label = useInterpolatedField(section, 'label', values);
    const description = useInterpolatedField(section, 'description', values);
    const placeholder = useInterpolatedField(section, 'placeholder', values);
    const required = readBooleanField(section, 'is_required', false);
    const disabled = readBooleanField(section, 'disabled', false);
    const initial = readField<string>(section, 'value') ?? '';
    const { value, error, setValue } = useFieldBinding(name, initial);

    return (
        <FieldShell label={label} description={description} required={required} error={error} className={buildSectionClasses(section)}>
            <RNTextInput
                value={value}
                onChangeText={(t) => setValue(t.replace(/[^0-9.\-]/g, ''))}
                placeholder={placeholder}
                editable={!disabled}
                keyboardType="numeric"
                style={{ borderWidth: 1, borderColor: error ? '#fa5252' : '#dee2e6', borderRadius: 4, padding: 10, backgroundColor: disabled ? '#f8f9fa' : '#fff' }}
            />
        </FieldShell>
    );
}
