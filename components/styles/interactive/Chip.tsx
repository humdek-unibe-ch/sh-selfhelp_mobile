/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { useState } from 'react';
import { Chip as HeroChip } from 'heroui-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readBooleanField, useInterpolatedField } from '@/components/renderer/useField';
import { mobileStyleProps } from '@/components/ui/mobileStyleProps';

/**
 * Chip — interactive selectable pill. Renders the HeroUI Native `Chip`
 * (animated, themed) on every platform, including web. It consumes the shared
 * semantic fields (`intent` -> color, `size`, `radius`); selection toggles the
 * visual variant.
 */
export function Chip({ section, values }: IStyleProps): React.ReactElement {
    const label = useInterpolatedField(section, 'label', values);
    const resolved = mobileStyleProps(section);
    const initiallyChecked =
        readBooleanField(section, 'chip_checked', false) ||
        readBooleanField(section, 'web_chip_checked', false);
    const disabled = resolved.isDisabled ?? false;
    const [checked, setChecked] = useState(initiallyChecked);

    return (
        <HeroChip
            color={resolved.color ?? 'default'}
            size={resolved.size ?? 'md'}
            variant={checked ? 'primary' : 'soft'}
            disabled={disabled}
            onPress={() => setChecked((c) => !c)}
            className={buildSectionClasses(section)}
            accessibilityRole="button"
            accessibilityState={{ disabled, selected: checked }}
            accessibilityLabel={label}
        >
            <HeroChip.Label>{label}</HeroChip.Label>
        </HeroChip>
    );
}
