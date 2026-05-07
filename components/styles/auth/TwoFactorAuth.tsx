import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { useInterpolatedField } from '@/components/renderer/useField';
import { verifyTwoFactor } from '@/services/authService';
import { FieldShell } from '@/components/styles/forms/_FieldShell';

export function TwoFactorAuth({ section, values }: IStyleProps): React.ReactElement {
    const labelCode = useInterpolatedField(section, 'label_code', values) || 'Code';
    const labelSubmit = useInterpolatedField(section, 'label_submit', values) || 'Verify';
    const labelTitle = useInterpolatedField(section, 'label_title', values);

    const params = useLocalSearchParams<{ user_id?: string }>();
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const onSubmit = async (): Promise<void> => {
        if (!params.user_id) {
            setErr('Missing user id');
            return;
        }
        setBusy(true);
        setErr(null);
        const res = await verifyTwoFactor({ id_users: Number(params.user_id), code });
        setBusy(false);
        if (res.kind === 'ok') router.replace('/');
        else if (res.kind === 'error') setErr(res.message);
    };

    return (
        <View className={buildSectionClasses(section)} style={{ padding: 16 }}>
            {labelTitle ? <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 12 }}>{labelTitle}</Text> : null}
            <FieldShell label={labelCode} error={err ?? undefined}>
                <TextInput
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    style={{ borderWidth: 1, borderColor: '#dee2e6', borderRadius: 4, padding: 10, fontSize: 18, letterSpacing: 4, textAlign: 'center' }}
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
