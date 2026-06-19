/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import type { IStyleProps } from '@/components/renderer/types';
import { MobileSelect } from '@/components/ui/adapters';
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
            const parsed: unknown = JSON.parse(raw);
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

    // Renders through the swappable HeroUI Native select adapter (popover
    // presentation via the provider portal host) on every platform, including
    // web — the portal host is mounted by `HeroUINativeProvider` everywhere.
    return (
        <FieldShell label={label} required={required} error={error} className={buildSectionClasses(section)}>
            <MobileSelect
                value={value}
                onValueChange={setValue}
                options={options.map((o) => ({ value: o.value, label: o.text }))}
                placeholder={placeholder}
                isDisabled={disabled}
                accessibilityLabel={label}
            />
        </FieldShell>
    );
}
