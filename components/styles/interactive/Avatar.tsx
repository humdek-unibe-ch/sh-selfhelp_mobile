/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { View } from 'react-native';
import { Avatar as HeroAvatar } from 'heroui-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { useInterpolatedField } from '@/components/renderer/useField';
import { resolveAssetUrl } from '@selfhelp/shared';
import { mobileStyleProps } from '@/components/ui/mobileStyleProps';
import { useServerStore } from '@/stores/serverStore';
import { initialsFromName } from '@/components/styles/interactive/avatarInitials';

/**
 * Avatar — renders the HeroUI Native `Avatar` (image + initials fallback) on
 * every platform, including web. Size comes from the shared `size` field
 * (clamped to HeroUI's sm|md|lg by the shared mapper). When no image and no
 * explicit initials are authored, initials are derived from the `name` field
 * (mirrors the web renderer's Mantine `name` auto-initials behaviour).
 */
export function Avatar({ section, values }: IStyleProps): React.ReactElement {
    const baseUrl = useServerStore((s) => s.serverUrl) ?? '';
    const src = useInterpolatedField(section, 'img_src', values);
    const initialsShared = useInterpolatedField(section, 'avatar_initials', values);
    const initialsLegacy = useInterpolatedField(section, 'web_avatar_initials', values);
    const name = useInterpolatedField(section, 'name', values);
    const resolved = mobileStyleProps(section);
    const size = resolved.size ?? 'md';
    const uri = src ? resolveAssetUrl(src, baseUrl) : undefined;
    const nameInitials = name ? initialsFromName(name) : '';
    const text = (initialsShared || nameInitials || initialsLegacy || '?').slice(0, 2).toUpperCase();

    return (
        <View className={buildSectionClasses(section)}>
            <HeroAvatar size={size} color={resolved.color ?? 'default'} alt={text}>
                {uri ? <HeroAvatar.Image source={{ uri }} /> : null}
                <HeroAvatar.Fallback>{text}</HeroAvatar.Fallback>
            </HeroAvatar>
        </View>
    );
}
