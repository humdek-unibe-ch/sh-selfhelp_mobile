import { Pressable, Text, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField, useInterpolatedField } from '@/components/renderer/useField';
import { useFieldBinding } from './_useFieldBinding';
import { FieldShell } from './_FieldShell';

export function Checkbox({ section, values }: IStyleProps): React.ReactElement {
    const name = readField<string>(section, 'name') ?? '';
    const label = useInterpolatedField(section, 'label', values);
    const description = useInterpolatedField(section, 'description', values);
    const required = readBooleanField(section, 'is_required', false);
    const onValue = readField<string>(section, 'checkbox_value') ?? '1';
    const offValue = '0';
    const initial = readField<string>(section, 'value') ?? offValue;
    const disabled = readBooleanField(section, 'disabled', false);
    const { value, error, setValue } = useFieldBinding(name, initial);
    const checked = value === onValue;

    return (
        <FieldShell description={description} required={required} error={error} className={buildSectionClasses(section)}>
            <Pressable
                disabled={disabled}
                onPress={() => setValue(checked ? offValue : onValue)}
                style={{ flexDirection: 'row', alignItems: 'center' }}
            >
                <View
                    style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        borderWidth: 2,
                        borderColor: checked ? '#228be6' : '#adb5bd',
                        backgroundColor: checked ? '#228be6' : 'transparent',
                        marginRight: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {checked ? <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>✓</Text> : null}
                </View>
                {label ? <Text>{label}</Text> : null}
            </Pressable>
        </FieldShell>
    );
}
