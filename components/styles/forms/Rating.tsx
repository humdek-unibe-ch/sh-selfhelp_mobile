import { Pressable, Text, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField, readNumberField, useInterpolatedField } from '@/components/renderer/useField';
import { useFieldBinding } from './_useFieldBinding';
import { FieldShell } from './_FieldShell';

export function Rating({ section, values }: IStyleProps): React.ReactElement {
    const name = readField<string>(section, 'name') ?? '';
    const label = useInterpolatedField(section, 'label', values);
    const count = readNumberField(section, 'mantine_rating_count', 5) ?? 5;
    const readonly = readBooleanField(section, 'readonly', false);
    const initial = readField<string>(section, 'value') ?? '0';
    const { value, error, setValue } = useFieldBinding(name, initial);
    const numericValue = Math.max(0, Math.min(count, Math.round(Number(value) || 0)));

    return (
        <FieldShell label={label} error={error} className={buildSectionClasses(section)}>
            <View style={{ flexDirection: 'row' }}>
                {Array.from({ length: count }, (_, i) => i + 1).map((i) => {
                    const filled = i <= numericValue;
                    return (
                        <Pressable key={i} onPress={() => !readonly && setValue(String(i))} style={{ paddingHorizontal: 2 }}>
                            <Text style={{ fontSize: 24, color: filled ? '#fab005' : '#dee2e6' }}>★</Text>
                        </Pressable>
                    );
                })}
            </View>
        </FieldShell>
    );
}
