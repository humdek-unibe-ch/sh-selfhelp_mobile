/**
 * Read-only viewer for the `rich-text-editor` style on mobile v1.
 *
 * The CMS stores HTML; we render it via `react-native-render-html`.
 * Editing on mobile is out-of-scope for v1 (full TipTap-equivalent
 * editing on RN is a significant follow-up — see `docs/architecture.md`).
 */

import { useWindowDimensions, View } from 'react-native';
import RenderHtml from 'react-native-render-html';

import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { useInterpolatedField } from '@/components/renderer/useField';
import { FieldShell } from './_FieldShell';

export function RichTextEditorReadOnly({ section, values }: IStyleProps): React.ReactElement {
    const { width } = useWindowDimensions();
    const label = useInterpolatedField(section, 'label', values);
    const valueField = useInterpolatedField(section, 'value', values);
    const placeholderField = useInterpolatedField(section, 'placeholder', values);
    const html = valueField || placeholderField;

    return (
        <FieldShell label={label} className={buildSectionClasses(section)}>
            <View style={{ borderWidth: 1, borderColor: '#dee2e6', borderRadius: 4, padding: 10 }}>
                <RenderHtml contentWidth={width - 24} source={{ html: html || '<p></p>' }} />
            </View>
        </FieldShell>
    );
}
