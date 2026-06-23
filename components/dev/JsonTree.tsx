/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Collapsible JSON tree for the debug surfaces (section `DebugWrapper`,
 * floating debug panel). Mirrors the web frontend's expandable section
 * inspector: objects/arrays are tappable disclosure rows, primitives are
 * colour-coded by type, and nodes expand to a configurable initial depth.
 *
 * Theme-aware via `useAppColors`. Pure presentational component — it never
 * mutates the data it is handed.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppColors, type IAppColors } from '@/hooks/useAppColors';

interface IJsonTreeProps {
    data: unknown;
    rootLabel?: string;
    initialExpandDepth?: number;
}

export function JsonTree({
    data,
    rootLabel = 'section',
    initialExpandDepth = 1,
}: IJsonTreeProps): React.ReactElement {
    const colors = useAppColors();
    return (
        <View>
            <JsonNode
                nodeKey={rootLabel}
                value={data}
                depth={0}
                colors={colors}
                initialExpandDepth={initialExpandDepth}
            />
        </View>
    );
}

interface IJsonNodeProps {
    nodeKey: string;
    value: unknown;
    depth: number;
    colors: IAppColors;
    initialExpandDepth: number;
}

function JsonNode({ nodeKey, value, depth, colors, initialExpandDepth }: IJsonNodeProps): React.ReactElement {
    const expandable = isExpandable(value);
    const [expanded, setExpanded] = useState(depth < initialExpandDepth);

    if (!expandable) {
        return (
            <View style={[styles.row, { paddingLeft: depth * 14 }]}>
                <Text style={[styles.key, { color: colors.primaryStrong }]}>{nodeKey}: </Text>
                <Text style={[styles.value, { color: valueColor(value, colors) }]} selectable>
                    {formatPrimitive(value)}
                </Text>
            </View>
        );
    }

    const entries = toEntries(value);
    const summary = Array.isArray(value)
        ? `[] ${entries.length}`
        : `{} ${entries.length}`;

    return (
        <View>
            <Pressable
                onPress={() => setExpanded((e) => !e)}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityLabel={`${nodeKey}, ${expanded ? 'expanded' : 'collapsed'}`}
                style={({ pressed }) => [
                    styles.row,
                    { paddingLeft: depth * 14, backgroundColor: pressed ? colors.pressed : 'transparent' },
                ]}
            >
                <Text style={[styles.caret, { color: colors.textFaint }]}>{expanded ? '\u25BC' : '\u25B6'}</Text>
                <Text style={[styles.key, { color: colors.primaryStrong }]}>{nodeKey}</Text>
                <Text style={[styles.summary, { color: colors.textFaint }]}> {summary}</Text>
            </Pressable>
            {expanded
                ? entries.map((entry) => (
                      <JsonNode
                          key={entry.key}
                          nodeKey={entry.key}
                          value={entry.value}
                          depth={depth + 1}
                          colors={colors}
                          initialExpandDepth={initialExpandDepth}
                      />
                  ))
                : null}
        </View>
    );
}

interface IEntry {
    key: string;
    value: unknown;
}

function isExpandable(value: unknown): boolean {
    if (value === null || typeof value !== 'object') return false;
    if (Array.isArray(value)) return value.length > 0;
    return Object.keys(value).length > 0;
}

function toEntries(value: unknown): IEntry[] {
    if (Array.isArray(value)) {
        return (value as unknown[]).map((item, index) => ({ key: String(index), value: item }));
    }
    if (value && typeof value === 'object') {
        return Object.entries(value as Record<string, unknown>).map(([key, v]) => ({ key, value: v }));
    }
    return [];
}

function formatPrimitive(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'object') {
        // Empty object / array — `isExpandable` already filtered non-empty.
        return Array.isArray(value) ? '[]' : '{}';
    }
    return String(value);
}

function valueColor(value: unknown, colors: IAppColors): string {
    if (value === null || value === undefined) return colors.textFaint;
    switch (typeof value) {
        case 'string':
            return colors.isDark ? '#8ce99a' : '#2b8a3e';
        case 'number':
            return colors.isDark ? '#74c0fc' : '#1971c2';
        case 'boolean':
            return colors.isDark ? '#ffa94d' : '#e8590c';
        default:
            return colors.text;
    }
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        paddingVertical: 2,
        borderRadius: 4,
    },
    caret: {
        fontSize: 10,
        width: 14,
        lineHeight: 18,
    },
    key: {
        fontSize: 12,
        fontWeight: '700',
        fontFamily: 'monospace',
        lineHeight: 18,
    },
    summary: {
        fontSize: 11,
        fontFamily: 'monospace',
        lineHeight: 18,
    },
    value: {
        fontSize: 12,
        fontFamily: 'monospace',
        lineHeight: 18,
        flexShrink: 1,
    },
});
