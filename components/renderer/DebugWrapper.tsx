/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Mobile renderer DebugWrapper.
 *
 * Mirrors the web frontend's `DebugWrapper` UX:
 *
 *   - When `section.debug === 1`, a small bug badge is shown anchored
 *     to the top-right of the rendered section. The section content
 *     itself is NOT decorated with borders — the badge alone is the
 *     indicator, so layouts stay clean.
 *   - Tapping the badge opens a modal with all the section's debug
 *     information: id, style name, section name, condition + result,
 *     css / css_mobile (raw + transformed via `cssMobileToUniwind`),
 *     and a full JSON tree of the section payload. The JSON is
 *     filterable through a search box.
 *   - When the section's `condition_debug.result === false` the
 *     content is replaced with a "Condition Failed" placeholder so
 *     the editor can still inspect the section even though it would
 *     normally render nothing.
 *
 * Production builds (`__DEV__ === false`) render children straight
 * through — the badge / modal only appear in dev / preview.
 */

import { useMemo, useState } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    type ViewStyle,
} from 'react-native';
import type { ReactNode } from 'react';

import { cssMobileToUniwind } from '@/styles/cssMobileToUniwind';
import type { TSectionLike } from './types';

export interface IConditionOutcome {
    visible: boolean;
    condition: string | null;
}

interface ISectionDebugMeta {
    debug?: number | null;
    css?: string | null;
    css_mobile?: string | null;
    condition?: string | null;
    condition_debug?: {
        result?: boolean;
        condition?: string | null;
        error?: unknown[];
    } | null;
    fields?: Record<string, unknown> | null;
    children?: unknown[];
    [key: string]: unknown;
}

interface IDebugWrapperProps {
    section: TSectionLike;
    children: ReactNode;
    conditionOutcome?: IConditionOutcome;
}

export function DebugWrapper({
    section,
    children,
    conditionOutcome,
}: IDebugWrapperProps): React.ReactElement {
    const meta = section as TSectionLike & ISectionDebugMeta;
    const debugEnabled = meta.debug === 1;

    const conditionFailed = Boolean(
        (meta.condition_debug?.result === false) ||
            (conditionOutcome?.condition && conditionOutcome.visible === false)
    );

    const [modalOpen, setModalOpen] = useState(false);

    if (!__DEV__ || !debugEnabled) {
        return <>{children}</>;
    }

    return (
        <View style={styles.anchor}>
            {conditionFailed ? <ConditionFailedPlaceholder /> : children}

            <Pressable
                onPress={() => setModalOpen(true)}
                accessibilityLabel="Open section debug info"
                style={({ pressed }) => [
                    styles.badge,
                    pressed && styles.badgePressed,
                    conditionFailed ? styles.badgeFail : null,
                ]}
                hitSlop={6}
            >
                <Text style={styles.badgeIcon}>🐞</Text>
            </Pressable>

            <SectionDebugModal
                visible={modalOpen}
                onClose={() => setModalOpen(false)}
                section={meta}
                conditionOutcome={conditionOutcome}
                conditionFailed={conditionFailed}
            />
        </View>
    );
}

function ConditionFailedPlaceholder(): React.ReactElement {
    return (
        <View style={styles.condFailBox}>
            <Text style={styles.condFailTitle}>Condition Failed</Text>
            <Text style={styles.condFailBody}>
                This element is hidden because its condition evaluated to false. Tap the bug to
                see why.
            </Text>
        </View>
    );
}

interface ISectionDebugModalProps {
    visible: boolean;
    onClose: () => void;
    section: TSectionLike & ISectionDebugMeta;
    conditionOutcome?: IConditionOutcome;
    conditionFailed: boolean;
}

function SectionDebugModal({
    visible,
    onClose,
    section,
    conditionOutcome,
    conditionFailed,
}: ISectionDebugModalProps): React.ReactElement {
    const [search, setSearch] = useState('');

    const cssMobile = section.css_mobile ?? null;
    const cssMobileTransformed = useMemo(() => cssMobileToUniwind(cssMobile), [cssMobile]);

    const condition = section.condition_debug?.condition ?? conditionOutcome?.condition ?? null;
    const conditionResult = section.condition_debug?.result ?? conditionOutcome?.visible;
    const conditionErrors = section.condition_debug?.error ?? [];

    const fieldsSnapshot = useMemo(
        () => (section.fields ? snapshotFields(section.fields) : []),
        [section.fields]
    );

    const filtered = useMemo(() => {
        if (!search.trim()) return fieldsSnapshot;
        const q = search.toLowerCase();
        return fieldsSnapshot.filter(
            (f) => f.name.toLowerCase().includes(q) || f.preview.toLowerCase().includes(q)
        );
    }, [fieldsSnapshot, search]);

    const sectionJson = useMemo(() => safeStringify(section, 2), [section]);

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                    <View style={styles.modalHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.modalTitle}>
                                {String(section.style_name)} <Text style={styles.modalId}>#{section.id}</Text>
                            </Text>
                            <Text style={styles.modalSubtitle}>
                                {section.section_name ?? '(unnamed)'} • path: {String(section.path ?? '—')}
                            </Text>
                        </View>
                        <Pressable
                            onPress={onClose}
                            accessibilityLabel="Close debug panel"
                            hitSlop={10}
                            style={({ pressed }) => [
                                styles.closeButton,
                                pressed && { opacity: 0.7 },
                            ]}
                        >
                            <Text style={styles.closeButtonText}>×</Text>
                        </Pressable>
                    </View>

                    <View style={styles.badgeRow}>
                        <DebugBadge label={String(section.style_name)} tone="neutral" />
                        {section.section_name ? (
                            <DebugBadge label={section.section_name} tone="outline" />
                        ) : null}
                        {condition ? (
                            <DebugBadge
                                label={`Condition: ${conditionResult ? 'PASS' : 'FAIL'}`}
                                tone={conditionResult ? 'pass' : 'fail'}
                            />
                        ) : null}
                        {conditionFailed ? <DebugBadge label="HIDDEN" tone="fail" /> : null}
                    </View>

                    <ScrollView style={styles.modalBody} contentContainerStyle={{ padding: 16 }}>
                        {/* Condition */}
                        {condition ? (
                            <DebugSection title="Condition">
                                <CodeBlock>{condition}</CodeBlock>
                                {conditionErrors.length > 0 ? (
                                    <View style={{ marginTop: 6 }}>
                                        <Text style={styles.dim}>Errors:</Text>
                                        {conditionErrors.map((err, idx) => (
                                            <CodeBlock key={idx} tone="warn">
                                                {String(err)}
                                            </CodeBlock>
                                        ))}
                                    </View>
                                ) : null}
                            </DebugSection>
                        ) : null}

                        {/* CSS */}
                        {section.css ? (
                            <DebugSection title="css (web)">
                                <CodeBlock>{section.css}</CodeBlock>
                            </DebugSection>
                        ) : null}
                        {cssMobile ? (
                            <DebugSection title="css_mobile">
                                <CodeBlock>{cssMobile}</CodeBlock>
                                {cssMobileTransformed ? (
                                    <View style={{ marginTop: 6 }}>
                                        <Text style={styles.dim}>Resolved (uniwind):</Text>
                                        <CodeBlock tone="info">{cssMobileTransformed}</CodeBlock>
                                    </View>
                                ) : null}
                            </DebugSection>
                        ) : null}

                        {/* Fields */}
                        <DebugSection
                            title={`Fields (${fieldsSnapshot.length})`}
                            right={
                                <TextInput
                                    placeholder="filter…"
                                    value={search}
                                    onChangeText={setSearch}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    style={styles.search}
                                />
                            }
                        >
                            {filtered.length === 0 ? (
                                <Text style={styles.dim}>{`No fields match "${search}".`}</Text>
                            ) : null}
                            {filtered.map((f) => (
                                <View key={f.name} style={styles.fieldRow}>
                                    <Text style={styles.fieldName}>{f.name}</Text>
                                    <Text style={styles.fieldPreview} numberOfLines={4}>
                                        {f.preview}
                                    </Text>
                                </View>
                            ))}
                        </DebugSection>

                        {/* Raw section JSON */}
                        <DebugSection title="Raw section (JSON)">
                            <CodeBlock multiline>{sectionJson}</CodeBlock>
                        </DebugSection>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

function DebugSection({
    title,
    right,
    children,
}: {
    title: string;
    right?: ReactNode;
    children: ReactNode;
}): React.ReactElement {
    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{title}</Text>
                {right ?? null}
            </View>
            <View>{children}</View>
        </View>
    );
}

type TBadgeTone = 'neutral' | 'outline' | 'pass' | 'fail';

function DebugBadge({ label, tone }: { label: string; tone: TBadgeTone }): React.ReactElement {
    const palette: Record<TBadgeTone, ViewStyle & { color?: string }> = {
        neutral: { backgroundColor: '#fef3bd', color: '#7a4f01' },
        outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#fab005', color: '#7a4f01' },
        pass: { backgroundColor: '#d3f9d8', color: '#2b8a3e' },
        fail: { backgroundColor: '#ffe3e3', color: '#c92a2a' },
    };
    const { color, ...box } = palette[tone];
    return (
        <View style={[styles.chipBase, box]}>
            <Text style={[styles.chipText, { color: color ?? '#212529' }]}>{label}</Text>
        </View>
    );
}

function CodeBlock({
    children,
    tone,
    multiline,
}: {
    children: string | ReactNode;
    tone?: 'info' | 'warn';
    multiline?: boolean;
}): React.ReactElement {
    const bg = tone === 'warn' ? '#fff5f5' : tone === 'info' ? '#e7f5ff' : '#f8f9fa';
    const fg = tone === 'warn' ? '#c92a2a' : tone === 'info' ? '#1864ab' : '#343a40';
    return (
        <View style={[styles.codeBlock, { backgroundColor: bg }]}>
            <Text
                style={[styles.codeText, { color: fg }]}
                selectable
                numberOfLines={multiline ? undefined : 6}
            >
                {children}
            </Text>
        </View>
    );
}

interface IFieldSnapshot {
    name: string;
    preview: string;
}

function snapshotFields(fields: Record<string, unknown>): IFieldSnapshot[] {
    return Object.entries(fields).map(([name, raw]) => {
        let preview: string;
        if (raw === null || raw === undefined) preview = '∅';
        else if (typeof raw === 'object') {
            const content = (raw as { content?: unknown }).content;
            if (typeof content === 'string') preview = content;
            else preview = safeStringify(raw, 2).slice(0, 400);
        } else preview = String(raw);
        return { name, preview };
    });
}

function safeStringify(input: unknown, indent = 2): string {
    try {
        const seen = new WeakSet<object>();
        return JSON.stringify(
            input,
            (_, value) => {
                if (typeof value === 'object' && value !== null) {
                    if (seen.has(value)) return '[circular]';
                    seen.add(value);
                }
                return value;
            },
            indent
        );
    } catch (e) {
        return `Could not stringify: ${(e as Error).message}`;
    }
}

const styles = StyleSheet.create({
    anchor: {
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#fab005',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
    },
    badgePressed: {
        opacity: 0.85,
        transform: [{ scale: 0.95 }],
    },
    badgeFail: {
        backgroundColor: '#fa5252',
    },
    badgeIcon: {
        fontSize: 12,
        lineHeight: 14,
    },
    condFailBox: {
        backgroundColor: '#fff8e1',
        borderColor: '#fab005',
        borderWidth: 1,
        borderRadius: 6,
        padding: 12,
    },
    condFailTitle: {
        color: '#7a4f01',
        fontWeight: '700',
        marginBottom: 4,
    },
    condFailBody: {
        color: '#7a4f01',
        fontSize: 13,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    modalCard: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        maxHeight: '88%',
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderColor: '#e9ecef',
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#212529',
    },
    modalId: {
        color: '#868e96',
        fontWeight: '500',
    },
    modalSubtitle: {
        marginTop: 2,
        color: '#6c757d',
        fontSize: 12,
    },
    closeButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        backgroundColor: '#f1f3f5',
    },
    closeButtonText: {
        fontSize: 22,
        lineHeight: 24,
        color: '#495057',
    },
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        paddingTop: 12,
        gap: 6,
    },
    chipBase: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        marginRight: 4,
        marginBottom: 4,
    },
    chipText: {
        fontSize: 11,
        fontWeight: '600',
    },
    modalBody: {
        flex: 1,
    },
    section: {
        marginBottom: 16,
        backgroundColor: '#fafafa',
        borderRadius: 8,
        padding: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    sectionTitle: {
        fontWeight: '700',
        color: '#343a40',
        fontSize: 13,
    },
    search: {
        backgroundColor: '#fff',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#dee2e6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        fontSize: 12,
        minWidth: 140,
    },
    dim: {
        color: '#868e96',
        fontSize: 11,
    },
    codeBlock: {
        borderRadius: 6,
        padding: 8,
        marginTop: 4,
    },
    codeText: {
        fontFamily: 'monospace',
        fontSize: 11,
        lineHeight: 16,
    },
    fieldRow: {
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderColor: '#e9ecef',
    },
    fieldName: {
        fontWeight: '700',
        color: '#1864ab',
        fontSize: 12,
    },
    fieldPreview: {
        marginTop: 2,
        color: '#495057',
        fontSize: 11,
        fontFamily: 'monospace',
    },
});
