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
 *
 * Fallback (mirrors Mantine `Image.fallbackSrc`): swap to `fallback_src` when
 * the main source can't load. expo-image's `onError` is unreliable on web (the
 * source can 404 around hydration and its cross-dissolve swaps the underlying
 * `<img>`), so we detect failure deterministically with `Image.prefetch`, which
 * rejects when the source can't load on both native and web — and, unlike
 * `fetch`, is not subject to CORS for cross-origin assets. `onError` stays as a
 * secondary trigger.
 */

import { useEffect, useState } from 'react';
import { Image as RNImage } from 'react-native';
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
    const fallback = useInterpolatedField(section, 'fallback_src', values);
    const blurhash = readField<string>(section, 'blurhash') ?? readField<string>(section, 'web_image_blurhash');
    const radius = readField<string>(section, 'shared_radius') ?? 'sm';
    const fit = (readField<string>(section, 'web_image_fit') ?? 'cover');
    const width = readNumberField(section, 'width') ?? readNumberField(section, 'web_width');
    const height = readNumberField(section, 'height') ?? readNumberField(section, 'web_height') ?? 200;
    const [errored, setErrored] = useState(false);

    const resolvedSrc = src ? resolveAssetUrl(src, baseUrl) : '';

    // Only preflight when a fallback is configured. `Image.prefetch` resolves on
    // success and rejects when the asset can't load, so a 404 deterministically
    // flips to the fallback regardless of the expo-image/web onError quirks.
    useEffect(() => {
        if (!fallback || !resolvedSrc) return undefined;
        let cancelled = false;
        setErrored(false);
        RNImage.prefetch(resolvedSrc)
            .then((ok) => { if (!cancelled && ok === false) setErrored(true); })
            .catch(() => { if (!cancelled) setErrored(true); });
        return () => { cancelled = true; };
    }, [resolvedSrc, fallback]);

    if (!src) return null;

    const activeSrc = errored && fallback ? fallback : src;

    return (
        <Image
            // Remount when we swap to the fallback so expo-image's cross-dissolve
            // doesn't keep the failed source's <img> lingering (hidden) in the DOM.
            key={errored && fallback ? 'fallback' : 'primary'}
            accessibilityLabel={alt}
            source={{ uri: resolveAssetUrl(activeSrc, baseUrl) }}
            placeholder={blurhash ? { blurhash } : undefined}
            onError={() => { if (fallback && !errored) setErrored(true); }}
            contentFit={FIT_MAP[fit] ?? 'cover'}
            transition={150}
            cachePolicy="memory-disk"
            className={buildSectionClasses(section)}
            style={{ width: width ?? '100%', height, borderRadius: RADIUS_PX[radius as TCanonicalRadius] ?? 4 }}
        />
    );
}
