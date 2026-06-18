/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { DEFAULT_DEV_SERVERS } from '@/config/dev-servers';
import { runtimeConfig } from '@/config/runtime';
import { SECURE_STORE_KEYS } from '@/constants/secureStore';
import { secureStore } from '@/services/secureStore';
import { clearAuthSession } from '@/services/sessionService';
import {
    canonicalizeLoopbackHost,
    fetchServerSelectionOptions,
    looksLikeWebFrontendUrl,
    normalizeServerUrlInput,
    type IServerSelectionOption,
} from '@/services/serverSelectionService';
import { useServerStore } from '@/stores/serverStore';

export default function ServerPicker(): React.ReactElement {
    const { redirect } = useLocalSearchParams<{ redirect?: string }>();
    const [custom, setCustom] = useState('');
    const [selectedUrl, setSelectedUrl] = useState<string>(DEFAULT_DEV_SERVERS[0]?.url ?? '');
    const [expanded, setExpanded] = useState(true);
    const [remoteServers, setRemoteServers] = useState<IServerSelectionOption[]>([]);
    const [loadingServers, setLoadingServers] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const setServerUrl = useServerStore((s) => s.setServerUrl);

    useEffect(() => {
        const selectionUrl = runtimeConfig.serverSelectionUrl;
        if (!selectionUrl) return undefined;

        let cancelled = false;
        setLoadingServers(true);
        fetchServerSelectionOptions(selectionUrl)
            .then((options) => {
                if (cancelled) return;
                setRemoteServers(options);
                if (options[0]?.url) setSelectedUrl(options[0].url);
            })
            .catch((error) => {
                if (cancelled) return;
                setMessage(
                    `Could not load remote server list: ${(error as Error).message}. If this is Expo Web, the legacy catalog does not send CORS headers; native Android/iOS can still load it, or use a custom URL/fallback preset.`
                );
            })
            .finally(() => {
                if (!cancelled) setLoadingServers(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const serverOptions = useMemo(() => {
        const merged = [...remoteServers, ...DEFAULT_DEV_SERVERS];
        const seen = new Set<string>();
        return merged.filter((server) => {
            const key = server.url.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [remoteServers]);

    const choose = async (url: string): Promise<void> => {
        setMessage(null);

        let normalized: string;
        try {
            normalized = normalizeServerUrlInput(url);
        } catch {
            setMessage('Enter a valid URL, for example http://127.0.0.1:8000');
            return;
        }

        if (Platform.OS === 'web') {
            normalized = canonicalizeLoopbackHost(normalized, 'localhost');
        }

        if (!normalized) return;

        if (looksLikeWebFrontendUrl(normalized)) {
            setMessage(
                'That looks like the Next.js web frontend. Select the Symfony backend API base URL instead. For page /t1, select the backend here, then open /t1 in this mobile preview.'
            );
            return;
        }

        await clearAuthSession({ clearQueries: true, reason: 'server-switch' });
        await secureStore.set(SECURE_STORE_KEYS.SERVER_URL, normalized);
        setServerUrl(normalized);
        router.replace(redirect && redirect !== '/server-picker' ? redirect : '/');
    };

    const selectedOption = serverOptions.find((server) => server.url === selectedUrl);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fafafa' }}>
            <ScrollView contentContainerStyle={{ padding: 24 }}>
                <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 8 }}>Pick a backend</Text>
                <Text style={{ color: '#666', marginBottom: 24 }}>
                    Choose where to fetch SelfHelp content from. This must be the Symfony backend URL, not a
                    Next.js page URL like http://127.0.0.1:3000/t1.
                </Text>

                <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
                    Server list {loadingServers ? '(loading...)' : ''}
                </Text>
                <Pressable
                    onPress={() => setExpanded((value) => !value)}
                    style={{
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        backgroundColor: '#fff',
                        borderRadius: 8,
                        marginBottom: expanded ? 4 : 16,
                        borderWidth: 1,
                        borderColor: '#ced4da',
                    }}
                >
                    <Text style={{ fontSize: 16, fontWeight: '600' }}>
                        {selectedOption?.label ?? selectedUrl}
                    </Text>
                    <Text style={{ color: '#666', marginTop: 4 }}>{selectedUrl}</Text>
                    <Text style={{ color: '#228be6', marginTop: 6 }}>{expanded ? 'Hide options' : 'Show options'}</Text>
                </Pressable>

                {expanded ? serverOptions.map((server) => (
                    <Pressable
                        key={server.url}
                        onPress={() => {
                            setSelectedUrl(server.url);
                            setExpanded(false);
                        }}
                        style={{
                            paddingVertical: 14,
                            paddingHorizontal: 16,
                            backgroundColor: server.url === selectedUrl ? '#e7f5ff' : '#fff',
                            borderRadius: 8,
                            marginBottom: 10,
                            borderWidth: 1,
                            borderColor: server.url === selectedUrl ? '#228be6' : '#e9ecef',
                        }}
                    >
                        <Text style={{ fontSize: 16, fontWeight: '600' }}>{server.label}</Text>
                        <Text style={{ color: '#666', marginTop: 4 }}>{server.url}</Text>
                    </Pressable>
                )) : null}

                <Pressable
                    onPress={() => {
                        void choose(selectedUrl);
                    }}
                    style={{
                        backgroundColor: '#228be6',
                        paddingVertical: 14,
                        borderRadius: 8,
                        alignItems: 'center',
                        marginBottom: 20,
                    }}
                >
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Use selected server</Text>
                </Pressable>

                <Text style={{ fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8 }}>
                    Custom URL
                </Text>
                <Text style={{ color: '#666', marginBottom: 8 }}>
                    Use this for a local Symfony backend, for example http://127.0.0.1:8000. Do not include the page
                    keyword; open /t1 in the mobile app after the server is selected.
                </Text>
                <TextInput
                    value={custom}
                    onChangeText={setCustom}
                    placeholder="http://127.0.0.1:8000"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    style={{
                        backgroundColor: '#fff',
                        borderRadius: 8,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: '#e9ecef',
                        marginBottom: 12,
                    }}
                />
                <Pressable
                    onPress={() => {
                        void choose(custom);
                    }}
                    style={{
                        backgroundColor: '#228be6',
                        paddingVertical: 14,
                        borderRadius: 8,
                        alignItems: 'center',
                    }}
                >
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Use custom URL</Text>
                </Pressable>
                {message ? (
                    <Text style={{ color: message.startsWith('Could not') ? '#e67700' : '#fa5252', marginTop: 12 }}>
                        {message}
                    </Text>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
}
