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
            return { value: String(obj.value ?? ''), text: String(obj.text ?? obj.label ?? obj.value ?? '') };
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
    const label = useInterpolatedField(section, 'label', values);
    const placeholder = useInterpolatedField(section, 'placeholder', values) || 'Select…';
    const required = readBooleanField(section, 'is_required', false);
    const disabled = readBooleanField(section, 'disabled', false);
    const multiple = readBooleanField(section, 'is_multiple', false);
    // The `select` style stores its choices under `options`; the `combobox` style
    // (which reuses this component on mobile) stores them under `combobox_options`.
    const options = parseOptions(readField(section, 'options') ?? readField(section, 'combobox_options'));
    const initial = readField<string>(section, 'value') ?? '';
    // mobile-only: how the option list opens (bottom-sheet | dialog | popover).
    // Empty falls back to the adapter default (bottom-sheet).
    const presentation = (readField<string>(section, 'mobile_select_presentation') || undefined) as
        | 'bottom-sheet' | 'dialog' | 'popover' | undefined;
    const { value, error, setValue } = useFieldBinding(name, initial);

    // Renders through the swappable HeroUI Native select adapter, which uses
    // HeroUI's real Select presentations (bottom-sheet / dialog / popover) via
    // the portal host mounted by HeroUINativeProvider.
    return (
        <FieldShell label={label} required={required} error={error} className={buildSectionClasses(section)}>
            <MobileSelect
                value={value}
                onValueChange={setValue}
                options={options.map((o) => ({ value: o.value, label: o.text }))}
                placeholder={placeholder}
                isDisabled={disabled}
                multiple={multiple}
                presentation={presentation}
                accessibilityLabel={label}
            />
        </FieldShell>
    );
}
