/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { ActivityIndicator, Text, View } from 'react-native';

interface ILoadingScreenProps {
    message?: string;
}

export function LoadingScreen({ message }: ILoadingScreenProps): React.ReactElement {
    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <ActivityIndicator size="large" />
            {message ? <Text style={{ marginTop: 12, color: '#666' }}>{message}</Text> : null}
        </View>
    );
}
