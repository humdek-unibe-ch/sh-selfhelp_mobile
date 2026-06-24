/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * PreviewDraftBanner — the mobile twin of the web `PreviewModeIndicator`.
 *
 * Rendered at the very top of the framed viewport (mounted as the first visible
 * child in `app/_layout.tsx`, so it sits inside the `PhoneFrame` device crop), it
 * shows a prominent orange "PREVIEW MODE" banner whenever the app is rendering
 * DRAFT/unpublished CMS content — i.e. the web-preview session engaged with
 * `preview=true` (mirrored into `devModeStore.previewMode`). This makes the
 * draft state visually unmistakable inside the CMS Live Preview's mobile frame,
 * matching the web frame's banner so an editor can always trust which mode the
 * rendered page is in.
 *
 * Copy + colours intentionally mirror the web `PreviewModeIndicator`
 * ("PREVIEW MODE - This page shows draft content", orange on white). Hidden when
 * not in preview/draft mode, so published previews and the normal app are
 * unaffected.
 *
 * @module components/preview/PreviewDraftBanner
 */

import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDevModeStore } from '@/stores/devModeStore';

export function PreviewDraftBanner(): React.ReactElement | null {
    const previewMode = useDevModeStore((s) => s.previewMode);
    if (!previewMode) return null;

    return (
        <SafeAreaView edges={['top']} style={styles.safe}>
            <View
                style={styles.banner}
                accessible
                accessibilityRole="alert"
                accessibilityLabel="Preview mode. This page shows draft content."
            >
                <Text style={styles.text} numberOfLines={1}>
                    PREVIEW MODE - This page shows draft content
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        backgroundColor: '#f7931e',
    },
    banner: {
        width: '100%',
        backgroundColor: '#f7931e',
        paddingVertical: 8,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'rgba(255,255,255,0.3)',
    },
    text: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 13,
        letterSpacing: 0.3,
        textAlign: 'center',
    },
});
