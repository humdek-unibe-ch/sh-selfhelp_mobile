/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * System / error surfaces: `no-access`, `not-found`, `missing`, `version`.
 *
 * `no-access` / `not-found` / `missing` render an accessible message card from
 * the section's `title` / `message` content fields (interpolated against the
 * page values), matching the shared `INoAccessStyle` / `INotFoundStyle` /
 * `IMissingStyle` contracts. The corner radius honours `radius`. The
 * presentation fields (`color` / `web_shadow` / `variant` button
 * variant) are not read on mobile; a plain accessible RN surface is the
 * documented fallback.
 *
 * `version` is a build/version diagnostic surface with no content fields, so it
 * renders nothing visible on mobile (the web renderer owns the version display).
 * It is kept as a real impl to satisfy the non-Partial registry contract.
 */
import { View, Text } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { useInterpolatedField } from '@/components/renderer/useField';
import { mobileStyleProps } from '@/components/ui/mobileStyleProps';
import { useAppColors } from '@/hooks/useAppColors';

interface ISystemSurfaceProps extends IStyleProps {
    defaultTitle: string;
}

function SystemSurface({ section, values, defaultTitle }: ISystemSurfaceProps): React.ReactElement {
    const title = useInterpolatedField(section, 'title', values, defaultTitle);
    const message = useInterpolatedField(section, 'message', values);
    const radius = mobileStyleProps(section).radiusPx ?? 12;
    const colors = useAppColors();

    return (
        <View
            className={buildSectionClasses(section)}
            style={{
                borderRadius: radius,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surfaceMuted,
                padding: 20,
                marginVertical: 8,
                gap: 8,
            }}
        >
            <Text accessibilityRole="header" style={{ fontWeight: '700', fontSize: 18, color: colors.text }}>
                {title}
            </Text>
            {message ? (
                <Text style={{ fontSize: 15, lineHeight: 22, color: colors.textMuted }}>{message}</Text>
            ) : null}
        </View>
    );
}

export function NoAccess(props: IStyleProps): React.ReactElement {
    return <SystemSurface {...props} defaultTitle="Access denied" />;
}

export function NotFound(props: IStyleProps): React.ReactElement {
    return <SystemSurface {...props} defaultTitle="Page not found" />;
}

export function Missing(props: IStyleProps): React.ReactElement {
    return <SystemSurface {...props} defaultTitle="Content unavailable" />;
}

export function Version(): React.ReactElement | null {
    return null;
}
