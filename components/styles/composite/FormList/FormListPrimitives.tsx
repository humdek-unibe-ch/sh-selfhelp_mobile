/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * The few building blocks the list screens share: a button with a 44-point
 * touch target and a visible state, and a banner that says what it is in words
 * (a coloured edge alone never carries the meaning).
 */
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { styles, type IListPalette } from './FormList.styles';

export type TListButtonTone = 'default' | 'primary' | 'danger';

interface IListButtonProps {
    label: string;
    onPress: () => void;
    tone?: TListButtonTone;
    disabled?: boolean;
    busy?: boolean;
    /** The longer spoken name when the visible text alone is not enough ("Edit Write report"). */
    accessibilityLabel?: string;
    palette: IListPalette;
    selected?: boolean;
    testID?: string;
    style?: StyleProp<ViewStyle>;
}

export function ListButton({
    label,
    onPress,
    tone = 'default',
    disabled = false,
    busy = false,
    accessibilityLabel,
    palette,
    selected,
    testID,
    style,
}: IListButtonProps): React.ReactElement {
    const filled = tone === 'primary';
    const color = filled ? palette.onPrimary : tone === 'danger' ? palette.dangerText : palette.text;
    const background = filled ? palette.primaryStrong : selected ? palette.activeSurface : palette.surface;
    const border = filled ? palette.primaryStrong : tone === 'danger' ? palette.dangerText : palette.border;
    const inactive = disabled || busy;

    return (
        <Pressable
            onPress={onPress}
            disabled={inactive}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? label}
            accessibilityState={{ disabled: inactive, busy, selected }}
            testID={testID}
            style={({ pressed }) => [
                styles.button,
                { backgroundColor: pressed ? palette.pressed : background, borderColor: border, opacity: inactive ? 0.6 : 1 },
                style,
            ]}
        >
            {busy ? <ActivityIndicator size="small" color={color} /> : null}
            <Text style={[styles.buttonText, { color }]}>{label}</Text>
        </Pressable>
    );
}

export type TListBannerTone = 'info' | 'warning' | 'error';

interface IListBannerProps {
    tone: TListBannerTone;
    title?: string;
    children?: ReactNode;
    palette: IListPalette;
    testID?: string;
}

/** A notice, a conflict or an error: an alert for assistive technology, a word and an edge for everyone. */
export function ListBanner({ tone, title, children, palette, testID }: IListBannerProps): React.ReactElement {
    const surface = tone === 'error' ? palette.dangerSurface : tone === 'warning' ? palette.warningSurface : palette.infoSurface;
    const edge = tone === 'error' ? palette.dangerText : tone === 'warning' ? palette.warningBorder : palette.infoBorder;
    const word = tone === 'error' ? 'Error' : tone === 'warning' ? 'Warning' : 'Note';

    return (
        <View
            accessibilityRole={tone === 'info' ? undefined : 'alert'}
            accessibilityLiveRegion="polite"
            testID={testID}
            style={[styles.banner, { backgroundColor: surface, borderColor: edge }]}
        >
            <Text style={[styles.bannerTitle, { color: palette.text }]}>{title ?? word}</Text>
            {typeof children === 'string' ? <Text style={[styles.bannerText, { color: palette.text }]}>{children}</Text> : children}
        </View>
    );
}

interface IListTextProps {
    children: ReactNode;
    palette: IListPalette;
    muted?: boolean;
    size?: number;
    bold?: boolean;
    selectable?: boolean;
}

/** Body text that follows the user's font scale and wraps instead of clipping. */
export function ListText({ children, palette, muted = false, size = 15, bold = false, selectable = false }: IListTextProps): React.ReactElement {
    return (
        <Text
            selectable={selectable}
            style={{ color: muted ? palette.textMuted : palette.text, fontSize: size, fontWeight: bold ? '700' : '400', flexShrink: 1 }}
        >
            {children}
        </Text>
    );
}
