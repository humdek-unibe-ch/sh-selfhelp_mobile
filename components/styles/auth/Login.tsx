/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { useInterpolatedField } from '@/components/renderer/useField';
import { login } from '@/services/authService';
import { FieldShell } from '@/components/styles/forms/_FieldShell';

export function Login({ section, values }: IStyleProps): React.ReactElement {
    const { redirect } = useLocalSearchParams<{ redirect?: string }>();
    const labelEmail = useInterpolatedField(section, 'label_user', values) || 'Email';
    const labelPassword = useInterpolatedField(section, 'label_pw', values) || 'Password';
    const labelLogin = useInterpolatedField(section, 'label_login', values) || 'Login';
    const labelTitle = useInterpolatedField(section, 'label_title', values);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onSubmit = async (): Promise<void> => {
        setBusy(true);
        setError(null);
        const res = await login({ email, password });
        setBusy(false);
        if (res.kind === 'ok') {
            router.replace(redirect && redirect !== '/login' ? redirect : '/');
        } else if (res.kind === '2fa') {
            router.replace({ pathname: '/two-factor', params: { user_id: String(res.userId) } });
        } else {
            setError(res.message);
        }
    };

    return (
        <View className={buildSectionClasses(section)} style={{ padding: 16 }}>
            {labelTitle ? <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 12 }}>{labelTitle}</Text> : null}
            <FieldShell label={labelEmail}>
                <TextInput
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={{ borderWidth: 1, borderColor: '#dee2e6', borderRadius: 4, padding: 10 }}
                />
            </FieldShell>
            <FieldShell label={labelPassword} error={error ?? undefined}>
                <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    style={{ borderWidth: 1, borderColor: '#dee2e6', borderRadius: 4, padding: 10 }}
                />
            </FieldShell>
            <Pressable
                onPress={() => {
                    void onSubmit();
                }}
                disabled={busy}
                style={{
                    backgroundColor: busy ? '#adb5bd' : '#228be6',
                    padding: 12,
                    borderRadius: 4,
                    marginTop: 10,
                    alignItems: 'center',
                }}
            >
                <Text style={{ color: '#fff', fontWeight: '600' }}>{busy ? '…' : labelLogin}</Text>
            </Pressable>
        </View>
    );
}
