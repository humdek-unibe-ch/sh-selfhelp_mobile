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
import { parseRangeValue, serializeRangeValue } from './_sliderValue';

/**
 * RangeSlider — functional two-thumb control on the HeroUI Native `Slider`
 * compound (its value supports `number[]`, giving real range behaviour with
 * two draggable thumbs). The CMS stores the value as a canonical `"lo,hi"`
 * string; we parse it into an ordered pair and write the committed pair back
 * on `onChangeEnd`. This is the OSS rendering.
 *
 * HeroUI Native **Pro** override (RF-34): the `WheelPicker` family where it fits,
 * swapped in by the Pro mobile build via the `@selfhelp/mobile-pro-ui` adapter seam.
 */
export function RangeSlider({ section, values }: IStyleProps): React.ReactElement {
    const name = readField<string>(section, 'name') ?? '';
    const label = useInterpolatedField(section, 'label', values);
    const description = useInterpolatedField(section, 'description', values);
    const required = readBooleanField(section, 'is_required', false);
    const disabled = readBooleanField(section, 'disabled', false);
    const min = readNumberField(section, 'web_numeric_min', 0) ?? 0;
    const max = readNumberField(section, 'web_numeric_max', 100) ?? 100;
    const step = readNumberField(section, 'web_numeric_step', 1) ?? 1;
    const initial = readField<string>(section, 'value') ?? '';
    const { value, error, setValue } = useFieldBinding(name, initial);

    const [low, high] = parseRangeValue(value, min, max);

    return (
        <FieldShell label={label} description={description} required={required} error={error} className={buildSectionClasses(section)}>
            <HeroSlider
                value={[low, high]}
                minValue={min}
                maxValue={max}
                step={step}
                isDisabled={disabled}
                aria-label={label || name}
                onChangeEnd={(next) => {
                    const pair = Array.isArray(next) ? next : [next, next];
                    setValue(serializeRangeValue([pair[0], pair[1] ?? pair[0]]));
                }}
            >
                <HeroSlider.Track>
                    <HeroSlider.Fill />
                    <HeroSlider.Thumb index={0} />
                    <HeroSlider.Thumb index={1} />
                </HeroSlider.Track>
                <HeroSlider.Output />
            </HeroSlider>
        </FieldShell>
    );
}
