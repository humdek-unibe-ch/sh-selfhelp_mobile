/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Pressable, Text, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField, useInterpolatedField } from '@/components/renderer/useField';
import { useFieldBinding } from './_useFieldBinding';
import { FieldShell } from './_FieldShell';

interface IItem {
    value: string;
    label?: string;
    text?: string;
}

function parseItems(raw: unknown): IItem[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as IItem[];
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw) as IItem[];
        } catch {
            return [];
        }
    }
    return [];
}

/**
 * Radio — OSS fallback: a stack of tappable RN radio rows. HeroUI Native **Pro**
 * override (Pro catalog, mobile-mapping §8): `RadioButtonGroup`, swapped in by
 * the Pro mobile build via the `@selfhelp/mobile-pro-ui` adapter seam.
 */
export function Radio({ section, values }: IStyleProps): React.ReactElement {
    const name = readField<string>(section, 'name') ?? '';
    const label = useInterpolatedField(section, 'label', values);
    const description = useInterpolatedField(section, 'description', values);
    const required = readBooleanField(section, 'is_required', false);
    const initial = readField<string>(section, 'value') ?? '';
    const items = parseItems(readField(section, 'items') ?? readField(section, 'radio_options'));
    const { value, error, setValue } = useFieldBinding(name, initial);

    return (
        <FieldShell label={label} description={description} required={required} error={error} className={buildSectionClasses(section)}>
            <View style={{ gap: 6 }}>
                {items.map((item) => (
                    <Pressable
                        key={item.value}
                        onPress={() => setValue(item.value)}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}
                    >
                        <View
                            style={{
                                width: 18,
                                height: 18,
                                borderRadius: 9,
                                borderWidth: 2,
                                borderColor: value === item.value ? '#228be6' : '#adb5bd',
                                marginRight: 8,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {value === item.value ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#228be6' }} /> : null}
                        </View>
                        <Text>{item.label ?? item.text ?? item.value}</Text>
                    </Pressable>
                ))}
            </View>
        </FieldShell>
    );
}
