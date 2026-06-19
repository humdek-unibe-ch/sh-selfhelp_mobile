/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import type { IStyleProps } from '@/components/renderer/types';
import { MobileTextarea } from '@/components/ui/adapters';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField, readNumberField, useInterpolatedField } from '@/components/renderer/useField';
import { useFieldBinding } from './_useFieldBinding';
import { FieldShell } from './_FieldShell';

export function Textarea({ section, values }: IStyleProps): React.ReactElement {
    const name = readField<string>(section, 'name') ?? '';
    const label = useInterpolatedField(section, 'label', values);
    const description = useInterpolatedField(section, 'description', values);
    const placeholder = useInterpolatedField(section, 'placeholder', values);
    const minRows = readNumberField(section, 'shared_min_rows', 3) ?? 3;
    const initial = readField<string>(section, 'value') ?? '';
    const required = readBooleanField(section, 'is_required', false);
    const disabled = readBooleanField(section, 'disabled', false);

    const { value, error, setValue } = useFieldBinding(name, initial);

    // Renders through the swappable HeroUI Native TextArea adapter (native
    // invalid/required state) on every platform, including web. `FieldShell`
    // owns the visible label/description, so the adapter is not given `label`
    // (avoids a double label).
    return (
        <FieldShell label={label} description={description} required={required} error={error} className={buildSectionClasses(section)}>
            <MobileTextarea
                value={value}
                onChangeText={setValue}
                placeholder={placeholder}
                isDisabled={disabled}
                isInvalid={!!error}
                isRequired={required}
                numberOfLines={minRows}
            />
        </FieldShell>
    );
}
