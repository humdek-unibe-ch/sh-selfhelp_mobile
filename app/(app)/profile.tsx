/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Profile screen — renders the CMS `profile` page via the shared
 * `ProfileContent` (also reused by the in-app `ProfileModal`).
 */

import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileContent } from '@/components/shell/ProfileContent';
import { useAppColors } from '@/hooks/useAppColors';

export default function ProfileScreen(): React.ReactElement {
    const colors = useAppColors();
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <ProfileContent />
        </SafeAreaView>
    );
}
