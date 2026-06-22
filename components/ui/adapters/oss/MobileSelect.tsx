/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Select } from 'heroui-native';
import { useAppColors } from '@/hooks/useAppColors';
import type { IMobileSelectProps } from '../types';

/**
 * OSS MobileSelect — uses the HeroUI Native `Select` compound for the trigger,
 * value, items and selected indicator (so it looks and behaves like the HeroUI
 * select), but presents the option list through a React Native `Modal` instead
 * of HeroUI's popover `Select.Portal`/`Select.Content`.
 *
 * Why: HeroUI's popover presentation gates its content behind a
 * `triggerPosition` obtained from `View.measure()` plus an `isReady` layout
 * check. Those resolve on iOS/Android but NOT on `react-native-web`, so on web
 * the trigger toggles open yet the option list never mounts ("nothing loads").
 * A plain RN `Modal` needs no measurement and renders identically on web and
 * native. The `Select.Item`s stay inside the `Select` root subtree, so React
 * context still drives selection + the checkmark indicator. The contract speaks
 * plain string values; HeroUI's `Select` speaks `{ value, label }` options, so
 * we map at the boundary. Pro swaps in the HeroUI Pro select (bottom-sheet).
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
    const [isOpen, setIsOpen] = useState(false);
    const colors = useAppColors();
    const selected = options.find((o) => o.value === value);

    return (
        <Select
            value={selected ? { value: selected.value, label: selected.label } : undefined}
            onValueChange={(option) => onValueChange?.(option?.value ?? '')}
            isOpen={isOpen}
            onOpenChange={setIsOpen}
            isDisabled={isDisabled}
            className={className || undefined}
        >
            <Select.Trigger accessibilityLabel={accessibilityLabel ?? placeholder} testID={testID}>
                <Select.Value placeholder={placeholder} />
                <Select.TriggerIndicator />
            </Select.Trigger>

            <Modal
                visible={isOpen}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => setIsOpen(false)}
            >
                <View style={styles.root}>
                    <Pressable
                        style={[StyleSheet.absoluteFill, { backgroundColor: colors.backdrop }]}
                        accessibilityLabel="Close"
                        onPress={() => setIsOpen(false)}
                    />
                    <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
                            {options.map((option) => (
                                <Select.Item key={option.value} value={option.value} label={option.label}>
                                    <Select.ItemLabel />
                                    <Select.ItemIndicator />
                                </Select.Item>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </Select>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    sheet: {
        width: '100%',
        maxWidth: 420,
        maxHeight: '70%',
        borderWidth: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
});
