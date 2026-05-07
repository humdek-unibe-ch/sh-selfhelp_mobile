/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Static visual chunks for the form container — the action row and the
 * result message banner. Field controls inside the form bring their own
 * styles.
 */

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    actions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    cancelButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#dee2e6',
    },
    cancelText: {
        color: '#495057',
        fontWeight: '600',
    },
    submitButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 4,
        backgroundColor: '#228be6',
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitText: {
        color: '#fff',
        fontWeight: '600',
    },
    resultBase: {
        marginTop: 12,
        fontWeight: '600',
    },
    resultError: { color: '#fa5252' },
    resultSuccess: { color: '#2f9e44' },
});
