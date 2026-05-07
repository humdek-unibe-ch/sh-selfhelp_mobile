/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { useInterpolatedField } from '@/components/renderer/useField';
import { Children } from '@/components/renderer/Children';
import { useAuthStore } from '@/stores/authStore';
import { logout } from '@/services/authService';

/**
 * The profile style displays the current user info and a logout
 * button. CMS-driven children are rendered above the static info so
 * editors can prepend extra forms (e.g. "change password").
 */
export function Profile({ section, values }: IStyleProps): React.ReactElement {
    const labelLogout = useInterpolatedField(section, 'label_logout', values) || 'Logout';
    const user = useAuthStore((s) => s.user);

    const onLogout = async (): Promise<void> => {
        await logout();
        router.replace('/login');
    };

    return (
        <View className={buildSectionClasses(section)} style={{ padding: 16 }}>
            <Children sections={(section as { children?: never }).children as never} values={values} />
            {user ? (
                <View style={{ marginVertical: 16 }}>
                    <Text style={{ fontSize: 18, fontWeight: '600' }}>{user.name ?? user.email}</Text>
                    <Text style={{ color: '#868e96' }}>{user.email}</Text>
                </View>
            ) : null}
            <Pressable
                onPress={() => {
                    void onLogout();
                }}
                style={{ backgroundColor: '#fa5252', padding: 12, borderRadius: 4, marginTop: 10, alignItems: 'center' }}
            >
                <Text style={{ color: '#fff', fontWeight: '600' }}>{labelLogout}</Text>
            </Pressable>
        </View>
    );
}
