/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Stack } from 'expo-router';

export default function PublicLayout(): React.ReactElement {
    return <Stack screenOptions={{ headerShown: false }} />;
}
