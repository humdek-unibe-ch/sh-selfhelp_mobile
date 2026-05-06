import { Text, View } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { Children } from '@/components/renderer/Children';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { useInterpolatedField } from '@/components/renderer/useField';

export function Figure({ section, values }: IStyleProps): React.ReactElement {
    const captionTitle = useInterpolatedField(section, 'caption_title', values);
    const caption = useInterpolatedField(section, 'caption', values);
    return (
        <View className={buildSectionClasses(section)} style={{ marginVertical: 8 }}>
            <Children sections={(section as { children?: never }).children as never} values={values} />
            {(captionTitle || caption) ? (
                <View style={{ marginTop: 6 }}>
                    {captionTitle ? <Text style={{ fontWeight: '600', color: '#495057' }}>{captionTitle}</Text> : null}
                    {caption ? <Text style={{ color: '#868e96', fontSize: 13 }}>{caption}</Text> : null}
                </View>
            ) : null}
        </View>
    );
}
