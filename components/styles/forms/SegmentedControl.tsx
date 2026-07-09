/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Pressable, Text, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readBooleanField, readField, useInterpolatedField } from '@/components/renderer/useField';
import { useFieldBinding } from './_useFieldBinding';
import { FieldShell } from './_FieldShell';
import { useAppColors } from '@/hooks/useAppColors';
import { resolveOptions } from '@selfhelp/shared';

/**
 * SegmentedControl — OSS fallback: a tab row (RN Pressables). HeroUI Native
 * **Pro** override (RF-30): `Segment`, swapped in by the Pro mobile build via
 * the `@selfhelp/mobile-pro-ui` adapter seam. Same CMS fields either way.
 */
export function SegmentedControl({ section, values }: IStyleProps): React.ReactElement {
    const name = readField<string>(section, 'name') ?? '';
    const label = useInterpolatedField(section, 'label', values);
    const disabled = readBooleanField(section, 'disabled', false);
    const segments = resolveOptions(
        readField(section, 'segmented_control_data'),
        readField(section, 'option_labels'),
    );
    const initial = readField<string>(section, 'value') ?? segments[0]?.value ?? '';
    const { value, error, setValue } = useFieldBinding(name, initial);
    const colors = useAppColors();

    return (
        <FieldShell label={label} error={error} className={buildSectionClasses(section)}>
            <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceMuted, padding: 2, borderRadius: 4 }}>
                {segments.map((seg) => {
                    const active = seg.value === value;
                    const segmentDisabled = disabled || seg.disabled === true;
                    return (
                        <Pressable
                            key={seg.value}
                            disabled={segmentDisabled}
                            accessibilityState={{ disabled: segmentDisabled, selected: active }}
                            onPress={() => setValue(seg.value)}
                            style={{
                                flex: 1,
                                paddingVertical: 8,
                                alignItems: 'center',
                                backgroundColor: active ? colors.surface : 'transparent',
                                borderRadius: 4,
                                opacity: segmentDisabled ? 0.5 : 1,
                            }}
                        >
                            <Text style={{ fontWeight: active ? '600' : '400', color: colors.text }}>{seg.label}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </FieldShell>
    );
}
