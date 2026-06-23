/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Fallback shown when a plugin style is declared on the backend but
 * not bundled in the current mobile build. Surfaces an actionable
 * "Open on web" link so the user can complete the interaction in the
 * browser.
 *
 * The renderer chooses this fallback (instead of `UnknownStyle`) when
 * the style's owner plugin is known but its mobile package is not
 * available in the running EAS build profile. This is *expected* for
 * plugins that declare `mobile.readonly: true` paired with web-only
 * widgets, or for plugins not bundled in the current profile at all.
 *
 * The deep link is composed from the backend URL + the current
 * `expo-router` pathname + the originating section id. The backend
 * URL is the live API base configured for the running instance
 * (mirrors the URL the app already uses for `/cms-api/*` calls).
 */

import { useMemo } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { usePathname } from 'expo-router';

import { runtimeConfig } from '@/config/runtime';
import { getWebPreviewRuntime } from '@/config/webPreview';

import type { IStyleProps } from './types';

export interface IOpenOnWebFallbackProps extends IStyleProps {
    pluginId: string;
}

export function OpenOnWebFallback({ section, pluginId }: IOpenOnWebFallbackProps): React.ReactElement | null {
    const pathname = usePathname();

    const href = useMemo(() => {
        // In a web preview the open-on-web link must target the web FRONTEND
        // origin (the instance domain), not the (private) backend base. Outside
        // a preview, fall back to the baked backend URL as before.
        const previewRuntime = getWebPreviewRuntime();
        const base = previewRuntime.enabled
            ? previewRuntime.webFrontendOrigin ?? runtimeConfig.bakedBackendUrl
            : runtimeConfig.bakedBackendUrl;
        if (!base) return null;
        const normalizedBase = base.replace(/\/+$/, '');
        const normalizedPath = pathname && pathname !== '/' ? pathname.replace(/^\/+/, '/') : '';
        const sectionId = section?.id ? String(section.id) : '';
        const hash = sectionId ? `#section-${sectionId}` : '';
        return `${normalizedBase}${normalizedPath}${hash}`;
    }, [pathname, section?.id]);

    const onOpen = (): void => {
        if (href) {
            void Linking.openURL(href);
        }
    };

    return (
        <View
            style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: '#dee2e6',
                backgroundColor: '#f8f9fa',
                marginVertical: 6,
            }}
        >
            <Text style={{ color: '#495057', fontWeight: '600', marginBottom: 4 }}>
                Available on the web version
            </Text>
            <Text style={{ color: '#495057', marginBottom: 8 }}>
                This section is provided by the &quot;{pluginId}&quot; plugin and is not bundled in the current
                mobile build. Open the web app to continue.
            </Text>
            {href ? (
                <Pressable
                    onPress={onOpen}
                    style={({ pressed }) => ({
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 4,
                        backgroundColor: pressed ? '#1971c2' : '#228be6',
                        alignSelf: 'flex-start',
                    })}
                    accessibilityRole="link"
                    accessibilityLabel="Open on web"
                >
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Open on web</Text>
                </Pressable>
            ) : (
                <Text style={{ color: '#868e96', fontStyle: 'italic' }}>
                    Web base URL is not configured for this build.
                </Text>
            )}
        </View>
    );
}
