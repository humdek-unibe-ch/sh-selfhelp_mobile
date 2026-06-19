/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readNumberField } from '@/components/renderer/useField';
import { colorToHex } from '@selfhelp/shared';

/**
 * ProgressSection — OSS fallback: an RN fill segment. HeroUI Native **Pro**
 * override (RF-28): `ProgressBar` / `ProgressCircle` section, swapped in by the
 * Pro mobile build via the `@selfhelp/mobile-pro-ui` adapter seam.
 */
export function ProgressSection({ section }: IStyleProps): React.ReactElement {
    const value = Math.max(0, Math.min(100, readNumberField(section, 'value', 0) ?? 0));
    const color = readField<string>(section, 'shared_color') ?? 'blue';
    return (
        <View
            className={buildSectionClasses(section)}
            style={{ width: `${value}%`, backgroundColor: colorToHex(color, 6) ?? '#228be6', height: '100%' }}
        />
    );
}
