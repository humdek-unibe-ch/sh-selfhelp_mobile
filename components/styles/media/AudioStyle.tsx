/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Pressable, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField } from '@/components/renderer/useField';
import { resolveAssetUrl } from '@selfhelp/shared';
import { useServerStore } from '@/stores/serverStore';

interface ISource {
    src?: string;
    type?: string;
}

export function AudioStyle({ section }: IStyleProps): React.ReactElement | null {
    const baseUrl = useServerStore((s) => s.serverUrl) ?? '';
    const sources = readField<ISource[]>(section, 'sources') ?? [];
    const src = sources[0]?.src ? resolveAssetUrl(sources[0].src, baseUrl) : null;

    const player = useAudioPlayer(src ?? undefined);
    const status = useAudioPlayerStatus(player);

    if (!src) return null;

    const playing = status?.playing === true;

    return (
        <View className={buildSectionClasses(section)} style={{ padding: 12, backgroundColor: '#f8f9fa', borderRadius: 6, marginVertical: 8 }}>
            <Pressable
                onPress={() => {
                    if (playing) player.pause();
                    else player.play();
                }}
                style={{
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    backgroundColor: playing ? '#e03131' : '#228be6',
                    borderRadius: 4,
                    alignSelf: 'flex-start',
                }}
            >
                <Text style={{ color: '#fff', fontWeight: '600' }}>{playing ? 'Pause' : 'Play'}</Text>
            </Pressable>
        </View>
    );
}
