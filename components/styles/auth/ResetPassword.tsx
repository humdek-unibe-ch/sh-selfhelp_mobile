/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { useState } from 'react';
import { Alert, View } from 'react-native';
import axios from 'axios';

import type { IStyleProps } from '@/components/renderer/types';
import {
    CLIENT_TYPE_MOBILE,
    ENDPOINTS,
    HEADER_CLIENT_TYPE,
    resolveMantineVariant,
    type IForgotPasswordRequest,
} from '@selfhelp/shared';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, useInterpolatedField } from '@/components/renderer/useField';
import { useServerStore } from '@/stores/serverStore';
import { MobileButton, MobileInput, MobileText } from '@/components/ui/adapters';
import { useAppColors } from '@/hooks/useAppColors';

/**
 * `resetPassword` requests a password-reset email. The actual reset
 * flow then lands the user on a `validate`-style screen via deep link.
 *
 * Built HeroUI-Native-first like `login`/`register`: title, input and submit
 * render through the adapter seam (`MobileText`/`MobileInput`/`MobileButton`)
 * and colours resolve through theme tokens (`useAppColors`) + the shared
 * variant resolver, so it is correct in dark and light. The submit button
 * honours the cross-platform `color` field, the same accent the web renderer
 * feeds into the Mantine button.
 */
export function ResetPassword({ section, values }: IStyleProps): React.ReactElement {
    const colors = useAppColors();
    const labelEmail = useInterpolatedField(section, 'label_user', values) || 'Email';
    const labelSubmit = useInterpolatedField(section, 'label_submit', values) || 'Send reset link';
    const labelTitle = useInterpolatedField(section, 'label_title', values);

    const sharedColor = readField<string>(section, 'color');
    const accent = sharedColor ? resolveMantineVariant('filled', sharedColor).accent : colors.primary;

    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);

    const onSubmit = async (): Promise<void> => {
        setBusy(true);
        const baseURL = useServerStore.getState().serverUrl;
        try {
            const payload: IForgotPasswordRequest = { email };
            await axios.post(
                `${baseURL}${ENDPOINTS.AUTH.FORGOT_PASSWORD}`,
                payload,
                { headers: { [HEADER_CLIENT_TYPE]: CLIENT_TYPE_MOBILE } }
            );
            Alert.alert('Reset link sent', 'Check your email.');
        } catch (e) {
            Alert.alert('Request failed', (e as Error).message);
        }
        setBusy(false);
    };

    return (
        <View className={buildSectionClasses(section)} style={{ padding: 16, gap: 12 }}>
            {labelTitle ? <MobileText emphasis="title">{labelTitle}</MobileText> : null}
            <MobileInput
                label={labelEmail}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                accessibilityLabel={labelEmail}
            />
            <MobileButton
                label={busy ? '…' : labelSubmit}
                onPress={() => {
                    void onSubmit();
                }}
                variant="primary"
                accentColor={sharedColor ? accent : undefined}
                isLoading={busy}
                fullWidth
            />
        </View>
    );
}
