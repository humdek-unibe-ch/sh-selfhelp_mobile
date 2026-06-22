/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readBooleanField, readField } from '@/components/renderer/useField';
import { resolveAssetUrl } from '@selfhelp/shared';
import { useServerStore } from '@/stores/serverStore';
import { useAppColors } from '@/hooks/useAppColors';

interface ISource {
    src?: string;
    type?: string;
}

export function AudioStyle({ section }: IStyleProps): React.ReactElement | null {
    const baseUrl = useServerStore((s) => s.serverUrl) ?? '';
    const colors = useAppColors();
    const sources = readField<ISource[]>(section, 'sources') ?? [];
    const src = sources[0]?.src ? resolveAssetUrl(sources[0].src, baseUrl) : null;

    // Playback toggles (common fields, '0' | '1'); controls default ON.
    const controls = readBooleanField(section, 'has_controls', true);
    const loop = readBooleanField(section, 'media_loop', false);
    const autoplay = readBooleanField(section, 'media_autoplay', false);

    const player = useAudioPlayer(src ?? undefined);
    const status = useAudioPlayerStatus(player);

    useEffect(() => {
        if (!src) return;
        player.loop = loop;
        if (autoplay) player.play();
    }, [player, src, loop, autoplay]);

    if (!src) return null;

    const playing = status?.playing === true;

    return (
        <View className={buildSectionClasses(section)} style={{ padding: 12, backgroundColor: colors.surfaceMuted, borderRadius: 6, marginVertical: 8 }}>
            {controls ? (
                <Pressable
                    onPress={() => {
                        if (playing) player.pause();
                        else player.play();
                    }}
                    style={{
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        backgroundColor: playing ? colors.danger : colors.primary,
                        borderRadius: 4,
                        alignSelf: 'flex-start',
                    }}
                >
                    <Text style={{ color: '#ffffff', fontWeight: '600' }}>{playing ? 'Pause' : 'Play'}</Text>
                </Pressable>
            ) : null}
        </View>
    );
}
