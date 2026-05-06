import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import axios from 'axios';

import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { useInterpolatedField } from '@/components/renderer/useField';
import { useServerStore } from '@/stores/serverStore';
import { CLIENT_TYPE_MOBILE, ENDPOINTS, HEADER_CLIENT_TYPE } from '@selfhelp/shared';
import { FieldShell } from '@/components/styles/forms/_FieldShell';

/**
 * `validate` finishes the registration flow: the user receives a
 * one-time link `/validate/{user_id}/{token}` and submits a password.
 * On mobile we expect the link to deep-link us into a screen which
 * mounts a page containing this style.
 */
export function Validate({ section, values }: IStyleProps): React.ReactElement {
    const labelPassword = useInterpolatedField(section, 'label_pw', values) || 'Password';
    const labelPasswordConfirm = useInterpolatedField(section, 'label_pw_confirm', values) || 'Confirm password';
    const labelSubmit = useInterpolatedField(section, 'label_activate', values) || 'Activate account';
    const labelTitle = useInterpolatedField(section, 'label_title', values);

    const params = useLocalSearchParams<{ user_id?: string; token?: string }>();
    const [pw, setPw] = useState('');
    const [pw2, setPw2] = useState('');
    const [busy, setBusy] = useState(false);

    const onSubmit = async (): Promise<void> => {
        if (pw !== pw2) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }
        if (!params.user_id || !params.token) {
            Alert.alert('Error', 'Invalid validation link');
            return;
        }
        setBusy(true);
        const baseURL = useServerStore.getState().serverUrl;
        try {
            await axios.post(
                `${baseURL}${ENDPOINTS.USER.COMPLETE_VALIDATION(Number(params.user_id), params.token)}`,
                { password: pw },
                { headers: { [HEADER_CLIENT_TYPE]: CLIENT_TYPE_MOBILE } }
            );
            Alert.alert('Account activated', 'You can now log in.');
        } catch (e) {
            Alert.alert('Activation failed', (e as Error).message);
        }
        setBusy(false);
    };

    return (
        <View className={buildSectionClasses(section)} style={{ padding: 16 }}>
            {labelTitle ? <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 12 }}>{labelTitle}</Text> : null}
            <FieldShell label={labelPassword}>
                <TextInput
                    value={pw}
                    onChangeText={setPw}
                    secureTextEntry
                    style={{ borderWidth: 1, borderColor: '#dee2e6', borderRadius: 4, padding: 10 }}
                />
            </FieldShell>
            <FieldShell label={labelPasswordConfirm}>
                <TextInput
                    value={pw2}
                    onChangeText={setPw2}
                    secureTextEntry
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
