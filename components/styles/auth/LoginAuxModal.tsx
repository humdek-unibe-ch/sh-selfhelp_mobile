/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * LoginAuxModal — mobile parity for the web login's "Forgot password?" /
 * "Create account" links. The web renders them as `<Anchor>`s that navigate to
 * the `reset-password` / `register` CMS pages. On mobile the same flow opens in
 * a modal: the target CMS page is fetched by keyword and its sections are
 * rendered headlessly (no app drawer/header) via `PageRenderer`, exactly like
 * `ProfileModal`/`ProfileContent`.
 *
 * Headless contract: only pages flagged `is_headless` in the CMS are meant to be
 * embedded this way (they carry the bare auth form, no nav chrome). The modal
 * surfaces a hint when a non-headless page is targeted so authors fix the flag
 * rather than shipping a broken-looking nested page.
 */

import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingScreen } from '@/components/feedback/LoadingScreen';
import { PageRenderer } from '@/components/renderer/PageRenderer';
import { usePageContent } from '@/hooks/usePageContent';
import { useAppColors } from '@/hooks/useAppColors';

interface ILoginAuxModalProps {
    /** CMS keyword of the target page (e.g. `reset-password`, `register`). */
    keyword: string | null;
    /** Header title shown above the embedded page. */
    title: string;
    onClose: () => void;
}

function AuxPageBody({ keyword }: { keyword: string }): React.ReactElement {
    const colors = useAppColors();
    const { data, isLoading, error } = usePageContent(keyword);

    if (isLoading) return <LoadingScreen />;

    if (error || !data) {
        return (
            <View style={{ padding: 24, gap: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                    Page unavailable
                </Text>
                <Text style={{ color: colors.textMuted }}>
                    {error?.message ?? `Could not load "${keyword}".`}
                </Text>
            </View>
        );
    }

    return (
        <>
            {!data.is_headless ? (
                <Text style={{ paddingHorizontal: 16, paddingTop: 12, color: colors.textFaint, fontSize: 12 }}>
                    This page is not marked headless; mark it headless in the CMS for a clean embedded view.
                </Text>
            ) : null}
            <PageRenderer page={data} />
        </>
    );
}

export function LoginAuxModal({ keyword, title, onClose }: ILoginAuxModalProps): React.ReactElement {
    const colors = useAppColors();
    const visible = keyword !== null;

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
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
                    <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{title}</Text>
                    <Pressable
                        onPress={onClose}
                        accessibilityRole="button"
                        accessibilityLabel="Close"
                        hitSlop={10}
                        style={({ pressed }) => ({
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: colors.surfaceMuted,
                            opacity: pressed ? 0.7 : 1,
                        })}
                    >
                        <Text style={{ fontSize: 20, lineHeight: 22, color: colors.textMuted }}>{'\u00d7'}</Text>
                    </Pressable>
                </View>
                <View style={{ flex: 1 }}>
                    {keyword ? <AuxPageBody keyword={keyword} /> : null}
                </View>
            </SafeAreaView>
        </Modal>
    );
}
