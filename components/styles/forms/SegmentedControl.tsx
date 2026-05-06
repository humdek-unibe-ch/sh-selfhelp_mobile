import { Pressable, Text, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, useInterpolatedField } from '@/components/renderer/useField';
import { useFieldBinding } from './_useFieldBinding';
import { FieldShell } from './_FieldShell';

interface ISegment {
    value: string;
    label: string;
}

function parseSegments(raw: unknown): ISegment[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as ISegment[];
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw) as ISegment[];
        } catch {
            return [];
        }
    }
    return [];
}

export function SegmentedControl({ section, values }: IStyleProps): React.ReactElement {
    const name = readField<string>(section, 'name') ?? '';
    const label = useInterpolatedField(section, 'label', values);
    const segments = parseSegments(readField(section, 'mantine_segmented_control_data'));
    const initial = readField<string>(section, 'value') ?? segments[0]?.value ?? '';
    const { value, error, setValue } = useFieldBinding(name, initial);

    return (
        <FieldShell label={label} error={error} className={buildSectionClasses(section)}>
            <View style={{ flexDirection: 'row', backgroundColor: '#f1f3f5', padding: 2, borderRadius: 4 }}>
                {segments.map((seg) => {
                    const active = seg.value === value;
                    return (
                        <Pressable
                            key={seg.value}
                            onPress={() => setValue(seg.value)}
                            style={{
                                flex: 1,
                                paddingVertical: 8,
                                alignItems: 'center',
                                backgroundColor: active ? '#fff' : 'transparent',
                                borderRadius: 4,
                            }}
                        >
                            <Text style={{ fontWeight: active ? '600' : '400', color: '#212529' }}>{seg.label}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </FieldShell>
    );
}
