/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';

/**
 * Timeline — OSS fallback: a plain container. Each child `timeline-item` draws
 * its own themed marker + connecting rail (so the dots/line stay aligned and
 * legible in both colour schemes without cross-component pixel math). HeroUI
 * Native **Pro** override (RF-31): `Stepper` (vertical), swapped in by the Pro
 * mobile build via the `@selfhelp/mobile-pro-ui` adapter seam. Same CMS fields
 * either way.
 */
export function Timeline({ section, values }: IStyleProps): React.ReactElement {
    return (
        <View className={buildSectionClasses(section)}>
            <Children sections={(section as { children?: never }).children} values={values} />
        </View>
    );
}
