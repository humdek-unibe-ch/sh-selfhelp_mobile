/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { MobileSwitch } from '@/components/ui/adapters';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField, useInterpolatedField } from '@/components/renderer/useField';
import { colorToHex } from '@selfhelp/shared';
import { useFieldBinding } from './_useFieldBinding';
import { FieldShell } from './_FieldShell';

export function Switch({ section, values }: IStyleProps): React.ReactElement {
    const name = readField<string>(section, 'name') ?? '';
    const label = useInterpolatedField(section, 'label', values);
    const description = useInterpolatedField(section, 'description', values);
    const onValue = readField<string>(section, 'web_switch_on_value') ?? '1';
    const offValue = readField<string>(section, 'web_switch_off_value') ?? '0';
    const initial = readField<string>(section, 'value') ?? offValue;
    const disabled = readBooleanField(section, 'disabled', false);
    const selectedColor = colorToHex(readField<string>(section, 'color') ?? '', 6);
    const { value, error, setValue } = useFieldBinding(name, initial);
    const isOn = value === onValue;

    // Renders through the swappable HeroUI Native switch adapter (animated thumb
    // + native selection state) on every platform, including web. The
    // label/description/error chrome stays on FieldShell, so the adapter renders
    // the control only (no duplicate label).
    return (
        <FieldShell label={label} description={description} error={error} className={buildSectionClasses(section)}>
            <View style={{ alignItems: 'flex-start' }}>
                <MobileSwitch
                    isSelected={isOn}
                    onSelectedChange={(next) => setValue(next ? onValue : offValue)}
                    isDisabled={disabled}
                    accessibilityLabel={label}
                    selectedColor={selectedColor}
                />
            </View>
        </FieldShell>
    );
}
