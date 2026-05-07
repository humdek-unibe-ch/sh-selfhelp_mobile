/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Floating debug panel for the mobile app — modelled after the web
 * frontend's `DebugMenu`.
 *
 * Visible only in dev/preview builds (`runtimeConfig.isDevInstance`).
 *
 * Tabs:
 *   - Logs:    in-memory log buffer (filterable by level)
 *   - Queries: TanStack Query state (active fetches, cached keys)
 *   - Auth:    bootstrapped flag, has-access-token, current user id
 *   - Server:  selected URL + the dev-only preview/phone-frame toggles
 *   - Info:    instance slug, locale, viewport, build flags
 *
 * Designed to be mounted *once* at the very top of the React tree (see
 * `app/_layout.tsx`). Production builds skip mounting it entirely.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';

import { runtimeConfig } from '@/config/runtime';
import { debugLogger, type IDebugLogEntry, type TDebugLevel } from '@/services/debugLogger';
import { useAuthStore } from '@/stores/authStore';
import { useDevModeStore } from '@/stores/devModeStore';
import { useLanguageStore } from '@/stores/languageStore';
import { useServerStore } from '@/stores/serverStore';

type TTab = 'logs' | 'queries' | 'auth' | 'server' | 'info';

const LEVEL_COLOR: Record<TDebugLevel, string> = {
    debug: '#6c757d',
    info: '#1c7ed6',
    warn: '#f08c00',
    error: '#e03131',
};

export function FloatingDebugPanel(): React.ReactElement | null {
    if (!runtimeConfig.isDevInstance) return null;
    return <FloatingDebugPanelInner />;
}

function FloatingDebugPanelInner(): React.ReactElement {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<TTab>('logs');

    return (
        <>
            {!open && (
                <Pressable
                    accessibilityLabel="Open debug panel"
                    onPress={() => setOpen(true)}
                    style={styles.fab}
                >
                    <Text style={styles.fabText}>D</Text>
                </Pressable>
            )}
            <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
                <View style={styles.backdrop}>
                    <View style={styles.sheet}>
                        <View style={styles.header}>
                            <Text style={styles.headerTitle}>Debug</Text>
                            <Pressable onPress={() => setOpen(false)} style={styles.closeBtn}>
                                <Text style={styles.closeBtnText}>✕</Text>
                            </Pressable>
                        </View>
                        <View style={styles.tabs}>
                            {(['logs', 'queries', 'auth', 'server', 'info'] as const).map((t) => (
                                <Pressable
                                    key={t}
                                    onPress={() => setTab(t)}
                                    style={[styles.tab, tab === t && styles.tabActive]}
                                >
                                    <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                                        {t}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                        <View style={styles.body}>
                            {tab === 'logs' && <LogsTab />}
                            {tab === 'queries' && <QueriesTab />}
                            {tab === 'auth' && <AuthTab />}
                            {tab === 'server' && <ServerTab />}
                            {tab === 'info' && <InfoTab />}
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

function LogsTab(): React.ReactElement {
    const [logs, setLogs] = useState<readonly IDebugLogEntry[]>(() => debugLogger.snapshot());
    const [filter, setFilter] = useState<TDebugLevel | 'all'>('all');
    const [query, setQuery] = useState('');
    const scrollRef = useRef<ScrollView | null>(null);

    useEffect(() => debugLogger.subscribe(setLogs), []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return logs.filter((l) => {
            if (filter !== 'all' && l.level !== filter) return false;
            if (!q) return true;
            return (
                l.message.toLowerCase().includes(q) ||
                (l.component ?? '').toLowerCase().includes(q)
            );
        });
    }, [logs, filter, query]);

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.toolbar}>
                <TextInput
                    placeholder="filter…"
                    value={query}
                    onChangeText={setQuery}
                    style={styles.input}
                    placeholderTextColor="#adb5bd"
                />
                <View style={styles.toolbarLevels}>
                    {(['all', 'debug', 'info', 'warn', 'error'] as const).map((lvl) => (
                        <Pressable
                            key={lvl}
                            onPress={() => setFilter(lvl)}
                            style={[styles.chip, filter === lvl && styles.chipActive]}
                        >
                            <Text
                                style={[
                                    styles.chipText,
                                    filter === lvl && styles.chipTextActive,
                                ]}
                            >
                                {lvl}
                            </Text>
                        </Pressable>
                    ))}
                </View>
                <Pressable onPress={() => debugLogger.clear()} style={styles.clearBtn}>
                    <Text style={styles.clearBtnText}>Clear</Text>
                </Pressable>
            </View>
            <ScrollView ref={scrollRef} style={{ flex: 1 }}>
                {filtered.length === 0 ? (
                    <Text style={styles.muted}>No logs.</Text>
                ) : (
                    filtered.map((l) => (
                        <View key={l.id} style={styles.logRow}>
                            <Text style={[styles.logLevel, { color: LEVEL_COLOR[l.level] }]}>
                                {l.level.toUpperCase()}
                            </Text>
                            <Text style={styles.logTime}>
                                {l.timestamp.split('T')[1]?.replace('Z', '') ?? ''}
                            </Text>
                            {l.component ? (
                                <Text style={styles.logComponent}>[{l.component}]</Text>
                            ) : null}
                            <Text style={styles.logMessage}>{l.message}</Text>
                            {l.data !== undefined && l.data !== null ? (
                                <Text style={styles.logData} numberOfLines={3}>
                                    {safeStringify(l.data)}
                                </Text>
                            ) : null}
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

function QueriesTab(): React.ReactElement {
    const fetching = useIsFetching();
    const qc = useQueryClient();
    const [, force] = useState(0);

    useEffect(() => {
        const u = qc.getQueryCache().subscribe(() => force((n) => n + 1));
        return () => u();
    }, [qc]);

    const queries = qc.getQueryCache().getAll();

    return (
        <ScrollView style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Active fetches: {fetching}</Text>
            <Pressable
                onPress={() => qc.invalidateQueries()}
                style={[styles.actionBtn, { marginVertical: 6 }]}
            >
                <Text style={styles.actionBtnText}>Invalidate all queries</Text>
            </Pressable>
            <Pressable
                onPress={() => qc.clear()}
                style={[styles.actionBtn, { marginBottom: 12 }]}
            >
                <Text style={styles.actionBtnText}>Clear cache</Text>
            </Pressable>
            {queries.map((q) => (
                <View key={q.queryHash} style={styles.queryRow}>
                    <Text style={styles.queryKey} numberOfLines={2}>
                        {JSON.stringify(q.queryKey)}
                    </Text>
                    <Text style={styles.queryStatus}>
                        status={q.state.status} fetchStatus={q.state.fetchStatus}
                    </Text>
                </View>
            ))}
        </ScrollView>
    );
}

function AuthTab(): React.ReactElement {
    const accessToken = useAuthStore((s) => s.accessToken);
    const user = useAuthStore((s) => s.user);
    const bootstrapped = useAuthStore((s) => s.bootstrapped);

    return (
        <ScrollView style={{ flex: 1 }}>
            <Row label="bootstrapped" value={String(bootstrapped)} />
            <Row label="hasAccessToken" value={String(Boolean(accessToken))} />
            <Row label="user.id" value={user ? String(user.id ?? '?') : '—'} />
            <Row label="user.name" value={(user?.name as string | undefined) ?? '—'} />
            <Row label="user.email" value={(user?.email as string | undefined) ?? '—'} />
        </ScrollView>
    );
}

function ServerTab(): React.ReactElement {
    const serverUrl = useServerStore((s) => s.serverUrl);
    const canSwitch = useServerStore((s) => s.canSwitchServers);
    const previewMode = useDevModeStore((s) => s.previewMode);
    const phoneFrame = useDevModeStore((s) => s.phoneFrame);
    const setPreview = useDevModeStore((s) => s.setPreviewMode);
    const setFrame = useDevModeStore((s) => s.setPhoneFrame);

    return (
        <ScrollView style={{ flex: 1 }}>
            <Row label="serverUrl" value={serverUrl ?? '—'} />
            <Row label="canSwitchServers" value={String(canSwitch)} />
            <View style={styles.divider} />
            <ToggleRow
                label="Preview content (?preview=true)"
                value={previewMode}
                onChange={setPreview}
                hint="Show draft / unpublished CMS content"
            />
            {Platform.OS === 'web' && (
                <ToggleRow
                    label="Phone frame (web preview)"
                    value={phoneFrame}
                    onChange={setFrame}
                    hint="Wrap the app in a 390×844 phone-shaped viewport"
                />
            )}
        </ScrollView>
    );
}

function InfoTab(): React.ReactElement {
    const locale = useLanguageStore((s) => s.locale);
    return (
        <ScrollView style={{ flex: 1 }}>
            <Row label="instance" value={runtimeConfig.instanceSlug} />
            <Row label="isDevInstance" value={String(runtimeConfig.isDevInstance)} />
            <Row label="bakedBackendUrl" value={runtimeConfig.bakedBackendUrl ?? '—'} />
            <Row label="platform" value={Platform.OS} />
            <Row label="locale" value={locale ?? '—'} />
            <Row label="__DEV__" value={String(__DEV__)} />
        </ScrollView>
    );
}

function Row({ label, value }: { label: string; value: string }): React.ReactElement {
    return (
        <View style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue}>{value}</Text>
        </View>
    );
}

function ToggleRow({
    label,
    value,
    onChange,
    hint,
}: {
    label: string;
    value: boolean;
    onChange: (v: boolean) => void;
    hint?: string;
}): React.ReactElement {
    return (
        <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{label}</Text>
                {hint ? <Text style={styles.muted}>{hint}</Text> : null}
            </View>
            <Switch value={value} onValueChange={onChange} />
        </View>
    );
}

function safeStringify(value: unknown): string {
    try {
        return typeof value === 'string' ? value : JSON.stringify(value);
    } catch {
        return String(value);
    }
}

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        right: 16,
        bottom: 96,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#212529',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.85,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
        elevation: 6,
        zIndex: 9999,
    },
    fabText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        height: '70%',
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 8,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#212529' },
    closeBtn: { padding: 6 },
    closeBtnText: { fontSize: 18, color: '#495057' },
    tabs: { flexDirection: 'row', gap: 6, marginVertical: 8 },
    tab: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: '#f1f3f5',
    },
    tabActive: { backgroundColor: '#212529' },
    tabText: { color: '#495057', fontWeight: '600', fontSize: 12, textTransform: 'uppercase' },
    tabTextActive: { color: '#fff' },
    body: { flex: 1 },
    toolbar: { paddingVertical: 6, gap: 6 },
    toolbarLevels: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
    input: {
        borderWidth: 1,
        borderColor: '#dee2e6',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 6,
        fontSize: 12,
        color: '#212529',
    },
    chip: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: '#f1f3f5',
    },
    chipActive: { backgroundColor: '#1c7ed6' },
    chipText: { color: '#495057', fontSize: 11, fontWeight: '600' },
    chipTextActive: { color: '#fff' },
    clearBtn: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: '#fa5252',
        borderRadius: 6,
    },
    clearBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    logRow: {
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f3f5',
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        gap: 4,
    },
    logLevel: { fontSize: 10, fontWeight: '700', width: 48 },
    logTime: { fontSize: 10, color: '#868e96' },
    logComponent: { fontSize: 10, color: '#1864ab', fontWeight: '600' },
    logMessage: { fontSize: 12, color: '#212529', flexBasis: '100%' },
    logData: { fontSize: 10, color: '#495057', flexBasis: '100%', fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: '#212529', marginVertical: 6 },
    actionBtn: { backgroundColor: '#1c7ed6', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10, alignSelf: 'flex-start' },
    actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 12 },
    queryRow: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f3f5' },
    queryKey: { fontSize: 11, color: '#212529', fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
    queryStatus: { fontSize: 10, color: '#868e96', marginTop: 2 },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f3f5' },
    rowLabel: { fontSize: 12, color: '#495057', fontWeight: '600' },
    rowValue: { fontSize: 12, color: '#212529', flex: 1, textAlign: 'right' },
    toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12, borderBottomWidth: 1, borderBottomColor: '#f1f3f5' },
    divider: { height: 1, backgroundColor: '#dee2e6', marginVertical: 8 },
    muted: { fontSize: 11, color: '#868e96' },
});
