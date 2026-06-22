/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField } from '@/components/renderer/useField';
import { useAppColors } from '@/hooks/useAppColors';
import { RADIUS_PX } from '@selfhelp/shared';
import type { TCanonicalRadius } from '@selfhelp/shared';

/**
 * ProgressRoot — OSS fallback: a segmented RN bar container. HeroUI Native
 * **Pro** override (RF-28): `ProgressBar` / `ProgressCircle`, swapped in by the
 * Pro mobile build via the `@selfhelp/mobile-pro-ui` adapter seam.
 */
export function ProgressRoot({ section, values }: IStyleProps): React.ReactElement {
    const colors = useAppColors();
    const radius = readField<string>(section, 'radius') ?? 'sm';
    return (
        <View
            className={buildSectionClasses(section)}
            style={{ flexDirection: 'row', height: 10, backgroundColor: colors.surfaceMuted, borderRadius: RADIUS_PX[radius as TCanonicalRadius] ?? 4, overflow: 'hidden', marginVertical: 6 }}
        >
            <Children sections={(section as { children?: never }).children} values={values} />
        </View>
    );
}
