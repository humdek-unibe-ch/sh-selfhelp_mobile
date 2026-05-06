import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import axios from 'axios';

import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { useInterpolatedField } from '@/components/renderer/useField';
import { useServerStore } from '@/stores/serverStore';
import { CLIENT_TYPE_MOBILE, ENDPOINTS, HEADER_CLIENT_TYPE } from '@selfhelp/shared';
import { FieldShell } from '@/components/styles/forms/_FieldShell';

/**
 * `register` is essentially a self-service form that POSTs to
 * `/auth/register`. The exact field names follow the legacy convention.
 */
export function Register({ section, values }: IStyleProps): React.ReactElement {
    const labelEmail = useInterpolatedField(section, 'label_user', values) || 'Email';
    const labelName = useInterpolatedField(section, 'label_name', values) || 'Name';
    const labelSubmit = useInterpolatedField(section, 'label_submit', values) || 'Register';
    const labelTitle = useInterpolatedField(section, 'label_title', values);

    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);

    const onSubmit = async (): Promise<void> => {
        setBusy(true);
        const baseURL = useServerStore.getState().serverUrl;
        try {
            await axios.post(
                `${baseURL}${ENDPOINTS.AUTH.LOGIN.replace('/login', '/register')}`,
                { email, name },
                { headers: { [HEADER_CLIENT_TYPE]: CLIENT_TYPE_MOBILE } }
            );
            Alert.alert('Registration submitted', 'Check your email for a validation link.');
        } catch (e) {
            Alert.alert('Registration failed', (e as Error).message);
        }
        setBusy(false);
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
            <FieldShell label={labelName}>
                <TextInput
                    value={name}
                    onChangeText={setName}
                    style={{ borderWidth: 1, borderColor: '#dee2e6', borderRadius: 4, padding: 10 }}
                />
            </FieldShell>
            <Pressable
                onPress={() => {
                    void onSubmit();
                }}
                disabled={busy}
                style={{ backgroundColor: busy ? '#adb5bd' : '#228be6', padding: 12, borderRadius: 4, marginTop: 10, alignItems: 'center' }}
            >
                <Text style={{ color: '#fff', fontWeight: '600' }}>{busy ? '…' : labelSubmit}</Text>
            </Pressable>
        </View>
    );
}
