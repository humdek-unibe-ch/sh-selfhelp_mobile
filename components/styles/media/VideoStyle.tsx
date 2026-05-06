import { useEvent } from 'expo';
import { Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField } from '@/components/renderer/useField';
import { resolveAssetUrl } from '@selfhelp/shared';
import { useServerStore } from '@/stores/serverStore';

interface ISource {
    src?: string;
    type?: string;
}

export function VideoStyle({ section }: IStyleProps): React.ReactElement | null {
    const baseUrl = useServerStore((s) => s.serverUrl) ?? '';
    const sources = readField<ISource[]>(section, 'sources') ?? [];
    const src = sources[0]?.src ? resolveAssetUrl(sources[0].src, baseUrl) : null;

    const player = useVideoPlayer(src ?? '', (p) => {
        if (src) p.loop = false;
    });
    // Touch the status event to keep the player alive across re-renders.
    useEvent(player, 'statusChange', { status: 'idle' });

    if (!src) {
        return (
            <View className={buildSectionClasses(section)} style={{ padding: 12, backgroundColor: '#f8f9fa', borderRadius: 4 }}>
                <Text style={{ color: '#868e96' }}>No video source</Text>
            </View>
        );
    }

    return (
        <VideoView
            className={buildSectionClasses(section)}
            style={{ width: '100%', height: 220, borderRadius: 4 }}
            player={player}
            fullscreenOptions={{ enable: true }}
            allowsPictureInPicture
        />
    );
}
