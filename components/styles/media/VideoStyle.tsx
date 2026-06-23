/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { useEvent } from 'expo';
import { Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readBooleanField, readField } from '@/components/renderer/useField';
import { resolveAssetUrl } from '@selfhelp/shared';
import { useServerStore } from '@/stores/serverStore';
import { useAppColors } from '@/hooks/useAppColors';

export function VideoStyle({ section }: IStyleProps): React.ReactElement | null {
    const baseUrl = useServerStore((s) => s.serverUrl) ?? '';
    const colors = useAppColors();
    const rawSrc = readField<string>(section, 'video_src');
    const src = rawSrc ? resolveAssetUrl(rawSrc, baseUrl) : null;

    // Playback toggles (common fields, '0' | '1'); controls default ON.
    const controls = readBooleanField(section, 'has_controls', true);
    const loop = readBooleanField(section, 'media_loop', false);
    const autoplay = readBooleanField(section, 'media_autoplay', false);
    // Browsers/OS require muted for autoplay, so force it on when autoplay is set.
    const muted = readBooleanField(section, 'media_muted', false) || autoplay;

    const player = useVideoPlayer(src ?? '', (p) => {
        if (!src) return;
        p.loop = loop;
        p.muted = muted;
        if (autoplay) p.play();
    });
    // Touch the status event to keep the player alive across re-renders.
    useEvent(player, 'statusChange', { status: 'idle' });

    if (!src) {
        return (
            <View className={buildSectionClasses(section)} style={{ padding: 12, backgroundColor: colors.surfaceMuted, borderRadius: 4 }}>
                <Text style={{ color: colors.textFaint }}>No video source</Text>
            </View>
        );
    }

    return (
        <VideoView
            className={buildSectionClasses(section)}
            style={{ width: '100%', height: 220, borderRadius: 4 }}
            player={player}
            nativeControls={controls}
            fullscreenOptions={{ enable: true }}
            allowsPictureInPicture
        />
    );
}
