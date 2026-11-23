/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * True while the app is open in the foreground. `inactive` (iOS: a system dialog, the app switcher in
 * transition) still counts as open; only `background` closes the live stream (decision 2026-11-20: live only
 * while the app is open, no background wake-up).
 */
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

export function useAppForeground(): boolean {
    const [foreground, setForeground] = useState(AppState.currentState !== 'background');

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (state) => {
            setForeground(state !== 'background');
        });
        return () => subscription.remove();
    }, []);

    return foreground;
}
