/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Slider as HeroSlider } from 'heroui-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readNumberField, readBooleanField, useInterpolatedField } from '@/components/renderer/useField';
import { useFieldBinding } from './_useFieldBinding';
import { FieldShell } from './_FieldShell';
import { parseSliderValue } from './_sliderValue';

/**
 * Slider — functional single-thumb control built on the HeroUI Native `Slider`
 * compound (draggable thumb + tap-to-position, accessibility from the primitive
 * layer). The CMS stores the value as a string; we parse/clamp it into the
 * numeric domain and write the committed value back on `onChangeEnd`.
 */
export function Slider({ section, values }: IStyleProps): React.ReactElement {
    const name = readField<string>(section, 'name') ?? '';
    const label = useInterpolatedField(section, 'label', values);
    const description = useInterpolatedField(section, 'description', values);
    const required = readBooleanField(section, 'is_required', false);
    const disabled = readBooleanField(section, 'disabled', false);
    const min = readNumberField(section, 'web_numeric_min', 0) ?? 0;
    const max = readNumberField(section, 'web_numeric_max', 100) ?? 100;
    const step = readNumberField(section, 'web_numeric_step', 1) ?? 1;
    const initial = readField<string>(section, 'value') ?? String(min);
    const { value, error, setValue } = useFieldBinding(name, initial);

    const current = parseSliderValue(value, min, max);

    return (
        <FieldShell label={label} description={description} required={required} error={error} className={buildSectionClasses(section)}>
            <HeroSlider
                value={current}
                minValue={min}
                maxValue={max}
                step={step}
                isDisabled={disabled}
                aria-label={label || name}
                onChangeEnd={(next) => setValue(String(Array.isArray(next) ? next[0] : next))}
            >
                <HeroSlider.Track>
                    <HeroSlider.Fill />
                    <HeroSlider.Thumb />
                </HeroSlider.Track>
                <HeroSlider.Output />
            </HeroSlider>
        </FieldShell>
    );
}
