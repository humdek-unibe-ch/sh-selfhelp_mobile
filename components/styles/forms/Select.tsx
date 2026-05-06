import { useState } from 'react';
import { Modal, Pressable, Text, View, ScrollView } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField, useInterpolatedField } from '@/components/renderer/useField';
import { useFieldBinding } from './_useFieldBinding';
import { FieldShell } from './_FieldShell';

interface IOption {
    value: string;
    text: string;
}

function parseOptions(raw: unknown): IOption[] {
    if (!raw) return [];
    if (Array.isArray(raw)) {
        return raw.map((entry) => {
            const obj = entry as Record<string, unknown>;
            return { value: String(obj.value ?? ''), text: String(obj.text ?? obj.value ?? '') };
        });
    }
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            return parseOptions(parsed);
        } catch {
            return [];
        }
    }
    return [];
}

export function Select({ section, values }: IStyleProps): React.ReactElement {
    const name = readField<string>(section, 'name') ?? '';
    const label = useInterpolatedField(section, 'alt', values);
    const placeholder = useInterpolatedField(section, 'placeholder', values) || 'Select…';
    const required = readBooleanField(section, 'is_required', false);
    const disabled = readBooleanField(section, 'disabled', false);
    const options = parseOptions(readField(section, 'options'));
    const initial = readField<string>(section, 'value') ?? '';
    const { value, error, setValue } = useFieldBinding(name, initial);
    const [open, setOpen] = useState(false);

    const selected = options.find((o) => o.value === value);

    return (
        <FieldShell label={label} required={required} error={error} className={buildSectionClasses(section)}>
            <Pressable
                disabled={disabled}
                onPress={() => setOpen(true)}
                style={{ borderWidth: 1, borderColor: error ? '#fa5252' : '#dee2e6', borderRadius: 4, padding: 10, backgroundColor: disabled ? '#f8f9fa' : '#fff' }}
            >
                <Text style={{ color: selected ? '#212529' : '#adb5bd' }}>{selected?.text ?? placeholder}</Text>
            </Pressable>
            <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
                <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}>
                    <View style={{ backgroundColor: '#fff', borderRadius: 8, maxHeight: '70%' }}>
                        <ScrollView>
                            {options.map((opt) => (
                                <Pressable
                                    key={opt.value}
                                    onPress={() => {
                                        setValue(opt.value);
                                        setOpen(false);
                                    }}
                                    style={{ padding: 14, borderBottomWidth: 1, borderColor: '#f1f3f5' }}
                                >
                                    <Text>{opt.text}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>
        </FieldShell>
    );
}
