/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Text } from 'react-native';
import { Select } from 'heroui-native';
import type { IMobileSelectProps } from '../types';
import { useAppColors } from '@/hooks/useAppColors';

/**
 * OSS MobileSelect — HeroUI Native `Select` driven through its real presentation
 * modes (no React Native `Modal` workaround).
 *
 * `presentation` (CMS `mobile_select_presentation`) picks how the option list
 * opens — `bottom-sheet` (default), `dialog`, or `popover`. `multiple` (CMS
 * `is_multiple`) switches to HeroUI's `selectionMode="multiple"`; the contract
 * value is then a comma-separated list of option values (single mode keeps the
 * plain string).
 *
 * Theming: HeroUI's bottom-sheet renders through `@gorhom/bottom-sheet`, whose
 * container does NOT pick up the Uniwind dark class on `react-native-web` (it
 * paints white, so the list was invisible in dark mode). We therefore pin a
 * theme-aware sheet background + handle and the item-label colour through
 * `useAppColors`, guaranteeing a legible list on every platform and both
 * schemes. The trigger shows the selected label(s) through a themed `Text`
 * (not `Select.Value`) so multi-select shows every pick and the current value
 * is always visible. Pro can swap in the HeroUI Pro select.
 */
type SelectOptionPair = { value: string; label: string };

function buildItems(options: IMobileSelectProps['options'], textColor: string): React.ReactElement[] {
    return options.map((option) => (
        <Select.Item
            key={option.value}
            value={option.value}
            label={option.label}
            disabled={option.disabled}
        >
            <Select.ItemLabel style={{ color: textColor }} />
            <Select.ItemIndicator />
        </Select.Item>
    ));
}

export function MobileSelect({
    value,
    onValueChange,
    options,
    placeholder = 'Select…',
    isDisabled,
    multiple,
    className,
    accessibilityLabel,
    testID,
    presentation = 'bottom-sheet',
}: IMobileSelectProps): React.ReactElement {
    const colors = useAppColors();

    const selectedValues = multiple
        ? (value ? value.split(',').map((v) => v.trim()).filter(Boolean) : [])
        : (value ? [value] : []);
    const selectedOptions: SelectOptionPair[] = options
        .filter((o) => selectedValues.includes(o.value))
        .map((o) => ({ value: o.value, label: o.label }));
    const hasValue = selectedOptions.length > 0;
    const displayText = hasValue ? selectedOptions.map((o) => o.label).join(', ') : placeholder;

    const items = buildItems(options, colors.text);

    let content: React.ReactElement;
    if (presentation === 'popover') {
        content = (
            <Select.Content presentation="popover" width="trigger">
                {items}
            </Select.Content>
        );
    } else if (presentation === 'dialog') {
        content = (
            <Select.Content presentation="dialog">
                <Select.ListLabel style={{ color: colors.textMuted }}>{placeholder}</Select.ListLabel>
                {items}
            </Select.Content>
        );
    } else {
        content = (
            <Select.Content
                presentation="bottom-sheet"
                backgroundStyle={{ backgroundColor: colors.surface }}
                handleIndicatorStyle={{ backgroundColor: colors.border }}
            >
                {items}
            </Select.Content>
        );
    }

    const triggerChildren = (
        <>
            <Text numberOfLines={1} style={{ flex: 1, color: hasValue ? colors.text : colors.textFaint }}>
                {displayText}
            </Text>
            <Select.TriggerIndicator />
        </>
    );
    const portal = (
        <Select.Portal>
            <Select.Overlay />
            {content}
        </Select.Portal>
    );

    if (multiple) {
        return (
            <Select
                selectionMode="multiple"
                presentation={presentation}
                value={selectedOptions}
                onValueChange={(opts) =>
                    onValueChange?.(
                        (opts ?? [])
                            .filter((o): o is SelectOptionPair => Boolean(o))
                            .map((o) => o.value)
                            .join(','),
                    )
                }
                isDisabled={isDisabled}
                className={className || undefined}
            >
                <Select.Trigger accessibilityLabel={accessibilityLabel ?? placeholder} testID={testID}>
                    {triggerChildren}
                </Select.Trigger>
                {portal}
            </Select>
        );
    }

    return (
        <Select
            presentation={presentation}
            value={selectedOptions[0]}
            onValueChange={(option) => onValueChange?.(option?.value ?? '')}
            isDisabled={isDisabled}
            className={className || undefined}
        >
            <Select.Trigger accessibilityLabel={accessibilityLabel ?? placeholder} testID={testID}>
                {triggerChildren}
            </Select.Trigger>
            {portal}
        </Select>
    );
}
