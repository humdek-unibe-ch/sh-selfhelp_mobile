import { Pressable, Text } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField, useInterpolatedField } from '@/components/renderer/useField';
import { useFieldBinding } from './_useFieldBinding';
import { FieldShell } from './_FieldShell';

/**
 * FileInput v1: stub that opens a placeholder. Wire up
 * `expo-document-picker` / `expo-image-picker` when forms with file
 * uploads are implemented end-to-end.
 */
export function FileInput({ section, values }: IStyleProps): React.ReactElement {
    const name = readField<string>(section, 'name') ?? '';
    const label = useInterpolatedField(section, 'label', values);
    const description = useInterpolatedField(section, 'description', values);
    const placeholder = useInterpolatedField(section, 'placeholder', values) || 'Choose a file…';
    const required = readBooleanField(section, 'is_required', false);
    const { value, error, setValue } = useFieldBinding(name);

    return (
        <FieldShell label={label} description={description} required={required} error={error} className={buildSectionClasses(section)}>
            <Pressable
                onPress={() => setValue('')}
                style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: '#adb5bd', borderRadius: 4, padding: 14 }}
            >
                <Text style={{ color: '#868e96' }}>{value || placeholder}</Text>
            </Pressable>
        </FieldShell>
    );
}
