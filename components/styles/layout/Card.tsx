/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Image, Text } from 'react-native';
import { resolveAssetUrl } from '@selfhelp/shared';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { MobileCard } from '@/components/ui/adapters';
import { mobileStyleProps } from '@/components/ui/mobileStyleProps';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { useInterpolatedField } from '@/components/renderer/useField';
import { useAppColors } from '@/hooks/useAppColors';
import { useServerStore } from '@/stores/serverStore';

/**
 * Card — renders through the swappable HeroUI Native card adapter on every
 * platform, including web. The adapter owns the themed surface (background,
 * border, elevation); the CMS radius token overrides the corner radius.
 *
 * Optional authoring-convenience content fields: when `img_src` is set the card
 * draws a cover image, and when `title` is set it draws a themed heading — both
 * above the child sections, with zero extra authoring. Empty fields render
 * nothing (a plain card). These never create child sections.
 */
export function Card({ section, values }: IStyleProps): React.ReactElement {
    const resolved = mobileStyleProps(section);
    const colors = useAppColors();
    const baseUrl = useServerStore((s) => s.serverUrl) ?? '';

    const title = useInterpolatedField(section, 'title', values);
    const imgSrc = useInterpolatedField(section, 'img_src', values);
    const imgUrl = imgSrc ? resolveAssetUrl(imgSrc, baseUrl) : '';

    return (
        <MobileCard radiusPx={resolved.radiusPx} className={buildSectionClasses(section)}>
            {imgUrl ? (
                <Image
                    source={{ uri: imgUrl }}
                    style={{ width: '100%', height: 160, borderRadius: 8, marginBottom: 12 }}
                    resizeMode="cover"
                    accessibilityIgnoresInvertColors
                />
            ) : null}
            {title ? (
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
                    {title}
                </Text>
            ) : null}
            <Children sections={(section as { children?: never }).children} values={values} />
        </MobileCard>
    );
}
