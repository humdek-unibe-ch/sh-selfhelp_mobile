/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { useInterpolatedField } from '@/components/renderer/useField';
import { verifyTwoFactor } from '@/services/authService';
import { MobileButton, MobileInput, MobileText } from '@/components/ui/adapters';
import { useAppColors } from '@/hooks/useAppColors';

/**
 * `two-factor-auth` verifies the one-time login code after a successful
 * password step. Built HeroUI-Native-first like `login`/`register`: title,
 * code input and submit render through the adapter seam
 * (`MobileText`/`MobileInput`/`MobileButton`) and colours resolve through theme
 * tokens (`useAppColors`), so it is legible in both dark and light. The style
 * exposes no authored colour field, so the button keeps the theme primary.
 */
export function TwoFactorAuth({ section, values }: IStyleProps): React.ReactElement {
    const colors = useAppColors();
    const labelCode = useInterpolatedField(section, 'label_code', values) || 'Code';
    const labelSubmit = useInterpolatedField(section, 'label_submit', values) || 'Verify';
    const labelTitle = useInterpolatedField(section, 'title', values);

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
        <View className={buildSectionClasses(section)} style={{ padding: 16, gap: 12 }}>
            {labelTitle ? <MobileText emphasis="title">{labelTitle}</MobileText> : null}
            <MobileInput
                label={labelCode}
                value={code}
                onChangeText={setCode}
                keyboardType="numeric"
                maxLength={6}
                isInvalid={!!err}
                accessibilityLabel={labelCode}
            />
            {err ? <Text style={{ color: colors.danger, fontSize: 13 }}>{err}</Text> : null}
            <MobileButton
                label={busy ? '…' : labelSubmit}
                onPress={() => {
                    void onSubmit();
                }}
                variant="primary"
                isLoading={busy}
                fullWidth
            />
        </View>
    );
}
