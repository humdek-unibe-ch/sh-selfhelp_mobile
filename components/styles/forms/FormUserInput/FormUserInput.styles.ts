/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Static visual chunks for the form container — the action row and the
 * result message banner. The action buttons themselves are themed inline from
 * the shared button knobs (RF-21), so only the row container + result banner
 * live here. Field controls inside the form bring their own styles.
 */

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    actions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    resultBase: {
        marginTop: 12,
        fontWeight: '600',
    },
    resultError: { color: '#fa5252' },
    resultSuccess: { color: '#2f9e44' },
});
