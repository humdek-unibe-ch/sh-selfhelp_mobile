/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Image style — uses `expo-image` instead of React Native's Image so we
 * get:
 *   - native disk + memory cache,
 *   - Blurhash placeholder support,
 *   - configurable transition + priority,
 *   - WebP / AVIF / SVG decoding.
 *
 * The backend may return a `blurhash` field per asset; if present we
 * pass it as the placeholder.
 */

import { Image, type ImageContentFit } from 'expo-image';

import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readNumberField, useInterpolatedField } from '@/components/renderer/useField';
import { RADIUS_PX, resolveAssetUrl } from '@selfhelp/shared';
import type { TCanonicalRadius } from '@selfhelp/shared';
import { useServerStore } from '@/stores/serverStore';

const FIT_MAP: Record<string, ImageContentFit> = {
    cover: 'cover',
    contain: 'contain',
    fill: 'fill',
    none: 'none',
    'scale-down': 'scale-down',
};

export function ImageStyle({ section, values }: IStyleProps): React.ReactElement | null {
    const baseUrl = useServerStore((s) => s.serverUrl) ?? '';
    const src = useInterpolatedField(section, 'img_src', values);
    const alt = useInterpolatedField(section, 'alt', values);
    const blurhash = readField<string>(section, 'blurhash') ?? readField<string>(section, 'mantine_image_blurhash');
    const radius = readField<string>(section, 'mantine_radius') ?? 'sm';
    const fit = (readField<string>(section, 'mantine_image_fit') ?? 'cover') as keyof typeof FIT_MAP;
    const width = readNumberField(section, 'width') ?? readNumberField(section, 'mantine_width');
    const height = readNumberField(section, 'height') ?? readNumberField(section, 'mantine_height') ?? 200;

    if (!src) return null;

    return (
        <Image
            accessibilityLabel={alt}
            source={{ uri: resolveAssetUrl(src, baseUrl) }}
            placeholder={blurhash ? { blurhash } : undefined}
            contentFit={FIT_MAP[fit] ?? 'cover'}
            transition={150}
            cachePolicy="memory-disk"
            className={buildSectionClasses(section)}
            style={{ width: width ?? '100%', height, borderRadius: RADIUS_PX[radius as TCanonicalRadius] ?? 4 }}
        />
    );
}
