import { Stack } from 'expo-router';

export default function PublicLayout(): React.ReactElement {
    return <Stack screenOptions={{ headerShown: false }} />;
}
