/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { ImageBackground } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, useInterpolatedField } from '@/components/renderer/useField';
import { RADIUS_PX, resolveAssetUrl } from '@selfhelp/shared';
import type { TCanonicalRadius } from '@selfhelp/shared';
import { useServerStore } from '@/stores/serverStore';

export function BackgroundImage({ section, values }: IStyleProps): React.ReactElement | null {
    const baseUrl = useServerStore((s) => s.serverUrl) ?? '';
    const src = useInterpolatedField(section, 'img_src', values);
    if (!src) return null;
    const radius = readField<string>(section, 'shared_radius') ?? 'sm';
    const url = resolveAssetUrl(src, baseUrl);
    return (
        <ImageBackground
            source={{ uri: url }}
            className={buildSectionClasses(section)}
            imageStyle={{ borderRadius: RADIUS_PX[radius as TCanonicalRadius] ?? 4 }}
            style={{ minHeight: 120 }}
        >
            <Children sections={(section as { children?: never }).children} values={values} />
        </ImageBackground>
    );
}
