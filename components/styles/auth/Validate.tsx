/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import axios from 'axios';

import type { IStyleProps } from '@/components/renderer/types';
import { CLIENT_TYPE_MOBILE, ENDPOINTS, HEADER_CLIENT_TYPE, resolveMantineVariant } from '@selfhelp/shared';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, useInterpolatedField } from '@/components/renderer/useField';
import { useServerStore } from '@/stores/serverStore';
import { MobileButton, MobileInput, MobileText } from '@/components/ui/adapters';
import { useAppColors } from '@/hooks/useAppColors';

/**
 * `validate` finishes the registration flow: the user receives a
 * one-time link `/validate/{user_id}/{token}` and submits a password.
 *
 * Route params (issue #30): the `user_id` + `token` this screen reads are the
 * resolved `page_routes` parameters. The deep-link handler (`native/deepLinks.ts`)
 * classifies the incoming `/validate/{user_id}/{token}` link and pushes those
 * snake_case values as Expo Router params, so `useLocalSearchParams` here is the
 * concrete delivery of the page's `route_params` — the param names match the
 * backend route pattern exactly. (For richer parameterized links the same
 * handler calls `pageService.resolvePageByPath()` and forwards the resolved
 * `route_params` the same way.)
 *
 * Built HeroUI-Native-first like `login`/`register`: title, inputs and submit
 * render through the adapter seam (`MobileText`/`MobileInput`/`MobileButton`)
 * and colours resolve through theme tokens (`useAppColors`) + the shared
 * variant resolver, so it is correct in dark and light. The submit button
 * honours the cross-platform `btn_save_color` field (shared with the custom
 * form renderer).
 */
export function Validate({ section, values }: IStyleProps): React.ReactElement {
    const colors = useAppColors();
    const labelPassword = useInterpolatedField(section, 'label_pw', values) || 'Password';
    const labelPasswordConfirm = useInterpolatedField(section, 'label_pw_confirm', values) || 'Confirm password';
    const labelSubmit = useInterpolatedField(section, 'label_activate', values) || 'Activate account';
    const labelTitle = useInterpolatedField(section, 'label_title', values);

    const sharedColor = readField<string>(section, 'btn_save_color');
    const accent = sharedColor ? resolveMantineVariant('filled', sharedColor).accent : colors.primary;

    // Resolved page_routes params (`user_id`, `token`) delivered as Expo Router
    // params by native/deepLinks.ts — see the file docblock (issue #30).
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
        <View className={buildSectionClasses(section)} style={{ padding: 16, gap: 12 }}>
            {labelTitle ? <MobileText emphasis="title">{labelTitle}</MobileText> : null}
            <MobileInput
                label={labelPassword}
                value={pw}
                onChangeText={setPw}
                secureTextEntry
                accessibilityLabel={labelPassword}
            />
            <MobileInput
                label={labelPasswordConfirm}
                value={pw2}
                onChangeText={setPw2}
                secureTextEntry
                accessibilityLabel={labelPasswordConfirm}
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
