/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import type { IStyleProps } from '@/components/renderer/types';
import { MobileCheckbox } from '@/components/ui/adapters';
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
    const labelPosition = readField<string>(section, 'label_position') === 'left' ? 'left' : 'right';
    // mobile-only: HeroUI Native checkbox variant (primary | secondary).
    const variant = (readField<string>(section, 'mobile_checkbox_variant') || undefined) as
        | 'primary' | 'secondary' | undefined;
    const { value, error, setValue } = useFieldBinding(name, initial);
    const checked = value === onValue;

    // Renders through the swappable HeroUI Native checkbox adapter (animated
    // indicator + native selection state) on every platform, including web.
    return (
        <FieldShell description={description} required={required} error={error} className={buildSectionClasses(section)}>
            <MobileCheckbox
                isSelected={checked}
                onSelectedChange={(next) => setValue(next ? onValue : offValue)}
                isDisabled={disabled}
                label={label}
                labelPosition={labelPosition}
                variant={variant}
                accessibilityLabel={label}
            />
        </FieldShell>
    );
}
