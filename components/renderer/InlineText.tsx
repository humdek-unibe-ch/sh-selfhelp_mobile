/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Render a list of {@link IInlineNode} runs (produced by `parseInlineRich`) as a
 * single React Native `<Text>` with nested `<Text>` children carrying the inline
 * formatting the CMS author applied (bold / italic / underline / link).
 *
 * RN cannot render HTML, so this is how Ctrl+B bold authored on the web reaches
 * the mobile app: the shared subset (`<strong>`/`<em>`/`<u>`/`<a>`) is parsed to
 * runs, and each formatted run becomes a nested `<Text>` (which inherits the
 * parent's size/colour and overrides only its own weight/style/decoration).
 *
 * The base typography (size, colour, alignment) lives on the outer `<Text>` via
 * `style`; pass `linkColor` so anchor runs use the same accent as the rest of the
 * renderer. Plain runs render as bare strings so there is no per-character View
 * overhead.
 */
import { Alert, Text, Linking, type StyleProp, type TextStyle } from 'react-native';
import { downloadCurrentFile } from '@/services/formListFileDownload';
import { messageForFileDownloadFailure } from '@/services/formListFiles';
import { parseListFileHref } from '@/services/listFileLink';
import type { IInlineNode } from './sanitizeContent';

interface IInlineTextProps {
    nodes: IInlineNode[];
    style?: StyleProp<TextStyle>;
    className?: string;
    /** Number of lines before truncating (maps to web `lineClamp`). */
    numberOfLines?: number;
    /** Accent applied to anchor runs (defaults to the inherited text colour). */
    linkColor?: string;
}

function runStyle(node: IInlineNode, linkColor?: string): TextStyle | undefined {
    const style: TextStyle = {};
    if (node.bold) style.fontWeight = 'bold';
    if (node.italic) style.fontStyle = 'italic';
    if (node.underline || node.href) style.textDecorationLine = 'underline';
    if (node.href && linkColor) style.color = linkColor;
    return Object.keys(style).length > 0 ? style : undefined;
}

/**
 * Press handler for an inline link: section-scoped list-file URLs download with
 * the visitor's session; every other href keeps Linking.openURL. A failed
 * list-file download is reported like FormList history (no unhandled rejection).
 */
export async function openInlineHref(href: string, linkText = 'file'): Promise<void> {
    const target = parseListFileHref(href);
    if (target !== null) {
        try {
            await downloadCurrentFile(target, linkText || 'file');
        } catch (error: unknown) {
            Alert.alert(messageForFileDownloadFailure(error));
        }
        return;
    }
    await Linking.openURL(href);
}

export function InlineText({ nodes, style, className, numberOfLines, linkColor }: IInlineTextProps): React.ReactElement {
    return (
        <Text style={style} className={className} numberOfLines={numberOfLines}>
            {nodes.map((node, index) => {
                const rs = runStyle(node, linkColor);
                if (node.href) {
                    const href = node.href;
                    const label = node.text;
                    return (
                        <Text
                            key={index}
                            style={rs}
                            onPress={() => {
                                void openInlineHref(href, label);
                            }}
                        >
                            {node.text}
                        </Text>
                    );
                }
                return rs ? (
                    <Text key={index} style={rs}>{node.text}</Text>
                ) : (
                    node.text
                );
            })}
        </Text>
    );
}
