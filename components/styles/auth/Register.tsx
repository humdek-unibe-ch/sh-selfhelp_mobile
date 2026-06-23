/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { useState } from 'react';
import { Text, View } from 'react-native';
import axios from 'axios';

import type { IStyleProps } from '@/components/renderer/types';
import { CLIENT_TYPE_MOBILE, ENDPOINTS, HEADER_CLIENT_TYPE, resolveMantineVariant } from '@selfhelp/shared';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField, useInterpolatedField } from '@/components/renderer/useField';
import { useServerStore } from '@/stores/serverStore';
import { MobileButton, MobileInput, MobileText } from '@/components/ui/adapters';
import { mobileStyleProps } from '@/components/ui/mobileStyleProps';
import { useAppColors } from '@/hooks/useAppColors';

/**
 * Register — the self-service registration form, built HeroUI-Native-first to
 * mirror the web `register` style and the polished mobile `login`. Title, inputs
 * and submit render through the adapter seam (`MobileText`/`MobileInput`/
 * `MobileButton`); colours resolve through theme tokens + the shared variant
 * resolver (never hard-coded), so it is correct in dark and light. It exposes
 * the same CMS fields as the web renderer: email + an optional validation code
 * (shown unless `open_registration` is on), driven by the `color` accent.
 */
export function Register({ section, values }: IStyleProps): React.ReactElement {
    const colors = useAppColors();
    const title = useInterpolatedField(section, 'title', values) || 'Registration';
    const labelUser = useInterpolatedField(section, 'label_user', values) || 'Email';
    const labelSubmit = useInterpolatedField(section, 'label_submit', values) || 'Register';
    const labelCode = useInterpolatedField(section, 'label_code', values) || 'Validation Code';
    const codePlaceholder = useInterpolatedField(section, 'code_placeholder', values) || 'Enter your code';
    const alertSuccess =
        useInterpolatedField(section, 'alert_success', values) ||
        'Registration successful! Please check your email for the activation link.';
    const alertFail = useInterpolatedField(section, 'alert_fail', values) || 'Invalid email or validation code.';

    // Open registration (`open_registration === '1'`) hides the validation code
    // field, matching the web renderer + backend policy.
    const codeRequired = !readBooleanField(section, 'open_registration', false);

    // Configurable accent — the SAME `color` the web button reads.
    const sharedColor = readField<string>(section, 'color');
    const accent = sharedColor ? resolveMantineVariant('filled', sharedColor).accent : colors.primary;
    const buttonVariant = mobileStyleProps(section).buttonVariant ?? 'primary';

    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    // The backend requires `page_id` to locate the register section + read the
    // open_registration / group policy (same payload the web renderer sends).
    // `PageRenderer` seeds it into the interpolation values.
    const pageId = typeof values.page_id === 'number' ? values.page_id : Number(values.page_id);

    const onSubmit = async (): Promise<void> => {
        if (!Number.isFinite(pageId) || pageId <= 0) {
            setError(alertFail);
            return;
        }
        setBusy(true);
        setError(null);
        const baseURL = useServerStore.getState().serverUrl;
        try {
            await axios.post(
                `${baseURL}${ENDPOINTS.AUTH.LOGIN.replace('/login', '/register')}`,
                { page_id: pageId, email, ...(codeRequired && code ? { code } : {}) },
                { headers: { [HEADER_CLIENT_TYPE]: CLIENT_TYPE_MOBILE } }
            );
            setDone(true);
        } catch (e) {
            setError((e as Error).message || alertFail);
        }
        setBusy(false);
    };

    if (done) {
        return (
            <View className={buildSectionClasses(section)} style={{ padding: 16, gap: 8 }}>
                <MobileText emphasis="title">{title}</MobileText>
                <Text style={{ color: colors.text, fontSize: 14 }}>{alertSuccess}</Text>
            </View>
        );
    }

    return (
        <View className={buildSectionClasses(section)} style={{ padding: 16, gap: 12 }}>
            {title ? <MobileText emphasis="title">{title}</MobileText> : null}
            <MobileInput
                label={labelUser}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                isInvalid={!!error}
                accessibilityLabel={labelUser}
            />
            {codeRequired ? (
                <MobileInput
                    label={labelCode}
                    value={code}
                    onChangeText={setCode}
                    placeholder={codePlaceholder}
                    isInvalid={!!error}
                    accessibilityLabel={labelCode}
                />
            ) : null}
            {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}
            <MobileButton
                label={busy ? '…' : labelSubmit}
                onPress={() => {
                    void onSubmit();
                }}
                variant={buttonVariant}
                accentColor={sharedColor ? accent : undefined}
                isLoading={busy}
                fullWidth
            />
        </View>
    );
}
