/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Semantic colour palette for app chrome (header, drawer, bottom tabs,
 * sheets, debug panels) that is painted with inline styles rather than
 * Uniwind classes.
 *
 * The values track HeroUI Native's own light / dark tokens
 * (`heroui-native/lib/.../variables.css`) so the chrome blends with
 * CMS-rendered HeroUI content. The active scheme is read reactively from
 * Uniwind via `useUniwind()`, so toggling the theme (or the OS scheme in
 * `auto` mode) repaints everything that consumes this hook.
 */

import { useUniwind } from 'uniwind';

export interface IAppColors {
    isDark: boolean;
    /** App screen background. */
    background: string;
    /** Raised surfaces: header, drawer, tab bar, cards, sheets. */
    surface: string;
    /** Subtle inset panels, chips, code blocks. */
    surfaceMuted: string;
    border: string;
    /** Primary text. */
    text: string;
    /** Secondary text. */
    textMuted: string;
    /** Tertiary / placeholder text + inactive icons. */
    textFaint: string;
    /** Brand accent. */
    primary: string;
    /** Stronger accent for active/selected emphasis. */
    primaryStrong: string;
    /** Foreground on top of `primary`. */
    onPrimary: string;
    /** Background for active/selected list rows. */
    activeSurface: string;
    danger: string;
    /** Modal / sheet scrim. */
    backdrop: string;
    /** Pressed-state background. */
    pressed: string;
}

const LIGHT: IAppColors = {
    isDark: false,
    background: '#ffffff',
    surface: '#ffffff',
    surfaceMuted: '#f1f3f5',
    border: '#e9ecef',
    text: '#212529',
    textMuted: '#495057',
    textFaint: '#868e96',
    primary: '#228be6',
    primaryStrong: '#1c7ed6',
    onPrimary: '#ffffff',
    activeSurface: '#e7f5ff',
    danger: '#fa5252',
    backdrop: 'rgba(0,0,0,0.45)',
    pressed: '#f1f3f5',
};

const DARK: IAppColors = {
    isDark: true,
    background: '#161618',
    surface: '#26262b',
    surfaceMuted: '#2c2c33',
    border: '#3a3a42',
    text: '#f1f3f5',
    textMuted: '#c1c2c5',
    textFaint: '#909296',
    primary: '#4dabf7',
    primaryStrong: '#74c0fc',
    onPrimary: '#0b1622',
    activeSurface: '#1b2733',
    danger: '#ff6b6b',
    backdrop: 'rgba(0,0,0,0.6)',
    pressed: '#2c2c33',
};

export function useAppColors(): IAppColors {
    const { theme } = useUniwind();
    return theme === 'dark' ? DARK : LIGHT;
}
