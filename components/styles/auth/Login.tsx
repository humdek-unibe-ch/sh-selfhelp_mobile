/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import type { IStyleProps } from '@/components/renderer/types';
import { resolveMantineVariant } from '@selfhelp/shared';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, useInterpolatedField } from '@/components/renderer/useField';
import { login } from '@/services/authService';
import { MobileButton, MobileInput, MobileText } from '@/components/ui/adapters';
import { mobileStyleProps } from '@/components/ui/mobileStyleProps';
import { useAppColors } from '@/hooks/useAppColors';
import { LoginAuxModal } from '@/components/styles/auth/LoginAuxModal';

/** CMS keywords of the auth pages the login links target (kebab-case = URL). */
const RESET_PASSWORD_KEYWORD = 'reset-password';
const REGISTER_KEYWORD = 'register';

/**
 * Login — a multi-element style built HeroUI-Native-first (style command
 * component-selection priority). The title/subtitle, both inputs and the submit
 * button all render through the HeroUI Native adapter seam (`MobileText`,
 * `MobileInput` = `TextField`+`Label`+`Input`, `MobileButton` = `Button`); the
 * only React-Native primitives are the layout `View` and the inline error `Text`
 * (HeroUI Native exposes no standalone error slot through the adapter). Colours
 * resolve through theme tokens (`useAppColors` + Uniwind), never hard-coded.
 */
export function Login({ section, values }: IStyleProps): React.ReactElement {
    const { redirect } = useLocalSearchParams<{ redirect?: string }>();
    const colors = useAppColors();
    const labelEmail = useInterpolatedField(section, 'label_user', values) || 'Email';
    const labelPassword = useInterpolatedField(section, 'label_pw', values) || 'Password';
    const labelLogin = useInterpolatedField(section, 'label_login', values) || 'Login';
    const labelTitle = useInterpolatedField(section, 'login_title', values);
    const subtitle = useInterpolatedField(section, 'subtitle', values);
    const labelPwReset = useInterpolatedField(section, 'label_pw_reset', values) || 'Forgot password?';
    const labelRegister = useInterpolatedField(section, 'label_register', values) || 'Create account';

    // Configurable accent (`color`) — the SAME cross-platform field the web
    // renderer feeds into the Mantine button `color`. Web maps the full Mantine
    // palette exactly; mobile resolves the exact accent hex through the shared
    // variant resolver and applies it to BOTH the submit button (via the adapter's
    // `accentColor`, which overrides the HeroUI variant fill while keeping the
    // readable white label) AND the two aux links. One field drives every accent,
    // so the colour is consistent and `color` works on mobile just like web.
    const sharedColor = readField<string>(section, 'color');
    const accent = sharedColor ? resolveMantineVariant('filled', sharedColor).accent : colors.primary;
    // A neutral `dark`/`black` accent (the seeded login default) is invisible on
    // the dark app background — both the filled button and the aux links collapse
    // to dark-on-dark. In dark mode fall back to the readable brand accent; light
    // mode keeps the original near-black look.
    const isNeutralAccent = sharedColor === 'dark' || sharedColor === 'black';
    const adaptiveAccent = isNeutralAccent && colors.isDark ? colors.primary : accent;
    const buttonVariant = mobileStyleProps(section).buttonVariant ?? 'primary';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // The auxiliary auth pages (reset-password / register) open headlessly in a
    // modal, mirroring the web login's anchor links. `aux` holds the page to show.
    const [aux, setAux] = useState<{ keyword: string; title: string } | null>(null);

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
        <View className={buildSectionClasses(section)} style={{ padding: 16, gap: 12 }}>
            {labelTitle ? <MobileText emphasis="title">{labelTitle}</MobileText> : null}
            {subtitle ? <MobileText emphasis="muted">{subtitle}</MobileText> : null}
            <MobileInput
                label={labelEmail}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                isInvalid={!!error}
                accessibilityLabel={labelEmail}
            />
            <MobileInput
                label={labelPassword}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                isInvalid={!!error}
                accessibilityLabel={labelPassword}
            />
            {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}
            <MobileButton
                label={busy ? '…' : labelLogin}
                onPress={() => {
                    void onSubmit();
                }}
                variant={buttonVariant}
                accentColor={sharedColor ? adaptiveAccent : undefined}
                isLoading={busy}
                fullWidth
            />
            <View style={{ gap: 8, marginTop: 4, alignItems: 'center' }}>
                {labelPwReset ? (
                    <Pressable
                        accessibilityRole="link"
                        onPress={() => setAux({ keyword: RESET_PASSWORD_KEYWORD, title: labelPwReset })}
                        hitSlop={8}
                    >
                        <Text style={{ color: adaptiveAccent, fontSize: 14 }}>{labelPwReset}</Text>
                    </Pressable>
                ) : null}
                {labelRegister ? (
                    <Pressable
                        accessibilityRole="link"
                        onPress={() => setAux({ keyword: REGISTER_KEYWORD, title: labelRegister })}
                        hitSlop={8}
                    >
                        <Text style={{ color: adaptiveAccent, fontSize: 14 }}>{labelRegister}</Text>
                    </Pressable>
                ) : null}
            </View>
            <LoginAuxModal
                keyword={aux?.keyword ?? null}
                title={aux?.title ?? ''}
                onClose={() => setAux(null)}
            />
        </View>
    );
}
