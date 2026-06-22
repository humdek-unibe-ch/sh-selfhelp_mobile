/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, useInterpolatedField } from '@/components/renderer/useField';
import { resolveAssetUrl } from '@selfhelp/shared';
import { useServerStore } from '@/stores/serverStore';
import { useAppColors } from '@/hooks/useAppColors';

export function Figure({ section, values }: IStyleProps): React.ReactElement {
    const captionTitle = useInterpolatedField(section, 'caption_title', values);
    const caption = useInterpolatedField(section, 'caption', values);
    // Optional built-in image: render automatically when set, without a child
    // image section. Never auto-creates a section.
    const baseUrl = useServerStore((s) => s.serverUrl) ?? '';
    const imgSrc = readField<string>(section, 'img_src');
    const alt = useInterpolatedField(section, 'alt', values);
    const colors = useAppColors();
    return (
        <View className={buildSectionClasses(section)} style={{ marginVertical: 8 }}>
            {imgSrc ? (
                <Image
                    accessibilityLabel={alt}
                    source={{ uri: resolveAssetUrl(imgSrc, baseUrl) }}
                    contentFit="cover"
                    transition={150}
                    cachePolicy="memory-disk"
                    style={{ width: '100%', height: 200, borderRadius: 4 }}
                />
            ) : null}
            <Children sections={(section as { children?: never }).children} values={values} />
            {(captionTitle || caption) ? (
                <View style={{ marginTop: 6 }}>
                    {captionTitle ? <Text style={{ fontWeight: '600', color: colors.textMuted }}>{captionTitle}</Text> : null}
                    {caption ? <Text style={{ color: colors.textFaint, fontSize: 13 }}>{caption}</Text> : null}
                </View>
            ) : null}
        </View>
    );
}
