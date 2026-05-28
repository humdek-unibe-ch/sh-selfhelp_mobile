/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * `PluginVersionMismatchBanner` — mobile counterpart of the web
 * banner in `sh-selfhelp_frontend/src/app/components/cms/plugins/
 * plugin-version-mismatch-banner/PluginVersionMismatchBanner.tsx`.
 *
 * Mounts non-blocking inside the root layout (under `RootStackInner`)
 * so the user sees the warning without losing access to the app. Tap
 * to dismiss for the rest of the session; the warning re-appears on
 * the next cold launch if the drift is still present.
 *
 * Renders nothing in healthy deployments — the hook returns an empty
 * array when versions match.
 */

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { usePluginVersionWarnings, type IPluginMobileVersionWarning } from './usePluginVersionWarnings';

function describeHint(kind: IPluginMobileVersionWarning['kind']): string {
    switch (kind) {
        case 'hostNewerThanApp':
            return 'Ship a new EAS build so the app picks up the new plugin code.';
        case 'appNewerThanHost':
            return 'Update the host plugin so its version matches the app.';
        case 'pluginNotBundled':
            return 'This plugin has no mobile package in the current EAS profile. The web app will continue to work via the "open on web" fallback.';
        default:
            return '';
    }
}

export function PluginVersionMismatchBanner(): React.ReactElement | null {
    const warnings = usePluginVersionWarnings();
    const [dismissed, setDismissed] = useState(false);

    const visible = useMemo(() => warnings.length > 0 && !dismissed, [warnings, dismissed]);
    if (!visible) return null;

    return (
        <View style={styles.banner}>
            <Text style={styles.title}>
                {warnings.length} plugin{warnings.length === 1 ? '' : 's'} out of sync
            </Text>
            <ScrollView style={styles.scroll}>
                {warnings.map((w) => (
                    <View key={`${w.pluginId}-${w.kind}`} style={styles.row}>
                        <Text style={styles.rowTitle}>
                            {w.pluginName ?? w.pluginId}
                        </Text>
                        <Text style={styles.rowMeta}>
                            app v{w.appVersion ?? '?'} · host v{w.hostVersion}
                        </Text>
                        <Text style={styles.rowMsg}>{w.message}</Text>
                        <Text style={styles.rowHint}>{describeHint(w.kind)}</Text>
                    </View>
                ))}
            </ScrollView>
            <Pressable onPress={() => setDismissed(true)} accessibilityRole="button">
                <Text style={styles.dismiss}>Dismiss for this session</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        backgroundColor: '#FEF3C7',
        borderColor: '#F59E0B',
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        margin: 12,
        maxHeight: 240,
    },
    title: {
        color: '#92400E',
        fontWeight: '700',
        marginBottom: 6,
    },
    scroll: {
        maxHeight: 160,
    },
    row: {
        paddingVertical: 6,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: '#F59E0B',
    },
    rowTitle: {
        color: '#92400E',
        fontWeight: '600',
    },
    rowMeta: {
        color: '#92400E',
        fontSize: 12,
    },
    rowMsg: {
        color: '#92400E',
        fontSize: 12,
        marginTop: 2,
    },
    rowHint: {
        color: '#9A3412',
        fontSize: 12,
        fontStyle: 'italic',
        marginTop: 2,
    },
    dismiss: {
        marginTop: 8,
        color: '#92400E',
        textDecorationLine: 'underline',
        fontSize: 12,
    },
});
