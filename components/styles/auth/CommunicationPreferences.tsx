/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Communication preferences toggles (issue #29).
 *
 * Lets the signed-in user control whether the backend may send them scheduled
 * notifications and (non-system) emails. The backend delivery preference is
 * independent of the OS push-notification permission: turning "Receive
 * notifications" on here does NOT request OS permission, and turning it off
 * does NOT delete the device push token — the scheduled-job executor enforces
 * the preference at send time.
 */

import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { updateCommunicationPreferences } from '@/services/userService';
import { useAuthStore } from '@/stores/authStore';

interface ICommunicationPreferencesProps {
    /** Optional section title override (CMS copy). */
    title?: string;
    /** Optional helper text override (CMS copy). */
    description?: string;
    notificationsLabel?: string;
    emailsLabel?: string;
}

export function CommunicationPreferences({
    title,
    description,
    notificationsLabel,
    emailsLabel,
}: ICommunicationPreferencesProps): React.ReactElement | null {
    const { t } = useTranslation();
    const user = useAuthStore((s) => s.user);
    const setUser = useAuthStore((s) => s.setUser);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(false);

    if (!user) {
        return null;
    }

    const persist = async (receivesNotifications: boolean, receivesEmails: boolean): Promise<void> => {
        setSaving(true);
        setError(false);
        try {
            const updated = await updateCommunicationPreferences(receivesNotifications, receivesEmails);
            if (updated) {
                setUser(updated);
            }
        } catch {
            setError(true);
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.container} accessible accessibilityLabel={title ?? t('profile.communication.title', 'Communication preferences')}>
            <Text style={styles.title}>
                {title ?? t('profile.communication.title', 'Communication preferences')}
            </Text>
            <Text style={styles.description}>
                {description ??
                    t(
                        'profile.communication.description',
                        'Choose which messages you receive. Account and security messages are always delivered.'
                    )}
            </Text>

            <View style={styles.row}>
                <Text style={styles.label}>
                    {notificationsLabel ?? t('profile.communication.notifications', 'Receive notifications')}
                </Text>
                <Switch
                    value={user.receives_notifications}
                    disabled={saving}
                    onValueChange={(value) => persist(value, user.receives_emails)}
                    accessibilityLabel={notificationsLabel ?? t('profile.communication.notifications', 'Receive notifications')}
                />
            </View>

            <View style={styles.row}>
                <Text style={styles.label}>
                    {emailsLabel ?? t('profile.communication.emails', 'Receive emails')}
                </Text>
                <Switch
                    value={user.receives_emails}
                    disabled={saving}
                    onValueChange={(value) => persist(user.receives_notifications, value)}
                    accessibilityLabel={emailsLabel ?? t('profile.communication.emails', 'Receive emails')}
                />
            </View>

            {saving ? <ActivityIndicator accessibilityLabel={t('saving', 'Saving')} /> : null}
            {error ? (
                <Text style={styles.error} accessibilityLiveRegion="polite">
                    {t('profile.communication.error', 'Could not update preferences. Please try again.')}
                </Text>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 16,
        gap: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
    },
    description: {
        fontSize: 13,
        opacity: 0.7,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    label: {
        fontSize: 15,
        flexShrink: 1,
        paddingRight: 12,
    },
    error: {
        color: '#d32f2f',
        fontSize: 13,
    },
});
