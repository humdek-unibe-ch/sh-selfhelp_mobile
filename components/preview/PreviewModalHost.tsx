/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * PreviewModalHost — renders an off-menu CMS page as a MODAL over home during a
 * web-preview session.
 *
 * The boot router (`app/_layout.tsx`) decides, per the `modal` embed param, that
 * the previewed keyword should be shown as a modal (off-menu page in `auto`, or
 * an explicit `modal=on`) and stores it in `usePreviewModalStore`. This host —
 * mounted once at the root — renders that page inside a React Native `Modal`
 * sliding up over the home screen, so a page with no menu entry is still
 * reachable in context. Closing returns to home (the underlying route).
 *
 * Kept dependency-light (RN `Modal`, not a third-party sheet) so it works in the
 * preview web build without extra native modules.
 */
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CmsPageScreen } from '@/components/renderer/CmsPageScreen';
import { findPageByKeyword, getPageLabel } from '@/components/shell/navigationUtils';
import { useAppColors } from '@/hooks/useAppColors';
import { usePages } from '@/hooks/usePages';
import { usePreviewModalStore } from '@/stores/previewModalStore';

export function PreviewModalHost(): React.ReactElement | null {
    const keyword = usePreviewModalStore((s) => s.keyword);
    const close = usePreviewModalStore((s) => s.close);
    const colors = useAppColors();
    const { data: pages } = usePages();

    if (!keyword) return null;

    const page = pages ? findPageByKeyword(pages, keyword) : null;
    const title = page ? getPageLabel(page) : keyword;

    return (
        <Modal visible animationType="slide" transparent onRequestClose={close}>
            <View style={{ flex: 1, backgroundColor: colors.backdrop }}>
                <SafeAreaView
                    edges={['bottom']}
                    style={{
                        flex: 1,
                        marginTop: 48,
                        backgroundColor: colors.background,
                        borderTopLeftRadius: 16,
                        borderTopRightRadius: 16,
                        overflow: 'hidden',
                    }}
                >
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            borderBottomWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.surface,
                        }}
                    >
                        <Text
                            numberOfLines={1}
                            style={{ flex: 1, fontSize: 16, fontWeight: '700', color: colors.text }}
                        >
                            {title}
                        </Text>
                        <Pressable
                            onPress={close}
                            accessibilityRole="button"
                            accessibilityLabel="Close preview"
                            hitSlop={8}
                            style={{
                                width: 32,
                                height: 32,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 16,
                                backgroundColor: colors.surfaceMuted,
                            }}
                        >
                            <Text style={{ fontSize: 18, color: colors.textMuted }}>{'\u00d7'}</Text>
                        </Pressable>
                    </View>
                    <View style={{ flex: 1 }}>
                        <CmsPageScreen keyword={keyword} />
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
}
