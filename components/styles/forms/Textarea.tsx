import { TextInput as RNTextInput } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField, readNumberField, useInterpolatedField } from '@/components/renderer/useField';
import { useFieldBinding } from './_useFieldBinding';
import { FieldShell } from './_FieldShell';

export function Textarea({ section, values }: IStyleProps): React.ReactElement {
    const name = readField<string>(section, 'name') ?? '';
    const label = useInterpolatedField(section, 'label', values);
    const description = useInterpolatedField(section, 'description', values);
    const placeholder = useInterpolatedField(section, 'placeholder', values);
    const minRows = readNumberField(section, 'mantine_textarea_min_rows', 3) ?? 3;
    const initial = readField<string>(section, 'value') ?? '';
    const required = readBooleanField(section, 'is_required', false);
    const disabled = readBooleanField(section, 'disabled', false);

    const { value, error, setValue } = useFieldBinding(name, initial);

    return (
        <FieldShell label={label} description={description} required={required} error={error} className={buildSectionClasses(section)}>
            <RNTextInput
                value={value}
                onChangeText={setValue}
                placeholder={placeholder}
                editable={!disabled}
                multiline
                numberOfLines={minRows}
                textAlignVertical="top"
                style={{
                    borderWidth: 1,
                    borderColor: error ? '#fa5252' : '#dee2e6',
                    borderRadius: 4,
                    padding: 10,
                    minHeight: minRows * 22,
                    backgroundColor: disabled ? '#f8f9fa' : '#fff',
                }}
            />
        </FieldShell>
    );
}
