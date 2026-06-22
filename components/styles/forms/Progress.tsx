/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readNumberField } from '@/components/renderer/useField';
import { useAppColors } from '@/hooks/useAppColors';
import { colorToHex, RADIUS_PX } from '@selfhelp/shared';
import type { TCanonicalRadius, TMantineSize } from '@selfhelp/shared';

const SIZE_TO_HEIGHT: Record<TMantineSize, number> = { xs: 4, sm: 6, md: 10, lg: 14, xl: 20 };

/**
 * Progress — OSS fallback: an RN bar (View width %). HeroUI Native **Pro**
 * override (RF-28): `ProgressBar` / `ProgressCircle`, swapped in by the Pro
 * mobile build via the `@selfhelp/mobile-pro-ui` adapter seam. Same CMS fields.
 */
export function Progress({ section }: IStyleProps): React.ReactElement {
    const colors = useAppColors();
    const value = Math.max(0, Math.min(100, readNumberField(section, 'value', 0) ?? 0));
    const color = readField<string>(section, 'color') ?? 'blue';
    const radius = readField<string>(section, 'radius') ?? 'sm';
    const size = (readField<string>(section, 'size') as TMantineSize | undefined) ?? 'md';
    const height = SIZE_TO_HEIGHT[size] ?? 10;

    return (
        <View
            className={buildSectionClasses(section)}
            style={{
                height,
                backgroundColor: colors.surfaceMuted,
                borderRadius: RADIUS_PX[radius as TCanonicalRadius] ?? 4,
                overflow: 'hidden',
                marginVertical: 6,
            }}
        >
            <View style={{ width: `${value}%`, height: '100%', backgroundColor: colorToHex(color, 6) ?? '#228be6' }} />
        </View>
    );
}
