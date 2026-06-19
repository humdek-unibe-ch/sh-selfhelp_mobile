/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Select } from 'heroui-native';
import type { IMobileSelectProps } from '../types';

/**
 * OSS MobileSelect — real HeroUI Native `Select` compound (Trigger / Value /
 * Portal / Overlay / Content / Item). Uses the default `popover` presentation
 * so it needs only the portal host provided by `HeroUINativeProvider` (no
 * `@gorhom/bottom-sheet` host required). That host is now mounted on web too,
 * so the popover works on every platform. The contract speaks plain string
 * values; HeroUI's `Select` speaks `{ value, label }` options, so we map
 * to/from the option object at the boundary. Pro swaps in the HeroUI Pro
 * select (bottom-sheet presentation).
 */
export function MobileSelect({
    value,
    onValueChange,
    options,
    placeholder = 'Select…',
    isDisabled,
    className,
    accessibilityLabel,
    testID,
}: IMobileSelectProps): React.ReactElement {
    const selected = options.find((o) => o.value === value);

    return (
        <Select
            value={selected ? { value: selected.value, label: selected.label } : undefined}
            onValueChange={(option) => onValueChange?.(option?.value ?? '')}
            isDisabled={isDisabled}
            className={className || undefined}
        >
            <Select.Trigger accessibilityLabel={accessibilityLabel ?? placeholder} testID={testID}>
                <Select.Value placeholder={placeholder} />
                <Select.TriggerIndicator />
            </Select.Trigger>
            <Select.Portal>
                <Select.Overlay />
                <Select.Content presentation="popover">
                    {options.map((option) => (
                        <Select.Item key={option.value} value={option.value} label={option.label}>
                            <Select.ItemLabel />
                            <Select.ItemIndicator />
                        </Select.Item>
                    ))}
                </Select.Content>
            </Select.Portal>
        </Select>
    );
}
