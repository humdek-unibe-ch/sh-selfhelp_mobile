/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { ImageBackground } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, useInterpolatedField } from '@/components/renderer/useField';
import { RADIUS_PX } from '@selfhelp/shared';
import type { TCanonicalRadius } from '@selfhelp/shared';
import { useAssetSource } from '@/components/renderer/useAssetSource';

export function BackgroundImage({ section, values }: IStyleProps): React.ReactElement | null {
    const image = useAssetSource(useInterpolatedField(section, 'img_src', values));
    if (!image) return null;
    const radius = readField<string>(section, 'radius') ?? 'sm';
    return (
        <ImageBackground
            source={image}
            className={buildSectionClasses(section)}
            imageStyle={{ borderRadius: RADIUS_PX[radius as TCanonicalRadius] ?? 4 }}
            style={{ minHeight: 120 }}
        >
            <Children sections={(section as { children?: never }).children} values={values} />
        </ImageBackground>
    );
}
