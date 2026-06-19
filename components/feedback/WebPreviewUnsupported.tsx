/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Honest placeholder for a style that depends on a genuinely native-only
 * capability and cannot run in the Expo Web preview.
 *
 * HeroUI Native itself now renders on web (`HeroUINativeProvider` is mounted on
 * every platform — see `providers/ThemeProvider.tsx`), so most styles work in
 * web preview. This notice is reserved for the few capabilities that have no web
 * equivalent (biometrics, camera/media capture, secure hardware, etc.). Rather
 * than fake a broken render, a native-only renderer shows this notice on web so
 * the author knows the real component only exists on device.
 */

import { Text, View } from 'react-native';

export const WEB_PREVIEW_UNSUPPORTED_MESSAGE =
    'This mobile component is not supported in web preview. Please test it on iOS/Android.';

export interface IWebPreviewUnsupportedProps {
    /**
     * CMS style / component name, surfaced in the notice for context.
     * `componentName` is the preferred prop; `name` is kept as an alias.
     */
    componentName?: string;
    name?: string;
    accessibilityLabel?: string;
    testID?: string;
}

export function WebPreviewUnsupported({
    componentName,
    name,
    accessibilityLabel,
    testID,
}: IWebPreviewUnsupportedProps): React.ReactElement {
    const resolvedName = componentName ?? name;
    const label =
        accessibilityLabel ??
        `${resolvedName ? `${resolvedName}: ` : ''}${WEB_PREVIEW_UNSUPPORTED_MESSAGE}`;
    return (
        <View
            accessibilityRole="text"
            accessibilityLabel={label}
            testID={testID}
            style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 4,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: '#adb5bd',
                backgroundColor: '#f1f3f5',
                marginVertical: 4,
            }}
        >
            <Text style={{ color: '#495057', fontWeight: '600' }}>{WEB_PREVIEW_UNSUPPORTED_MESSAGE}</Text>
            {resolvedName ? <Text style={{ color: '#868e96', marginTop: 2 }}>{resolvedName}</Text> : null}
        </View>
    );
}

/**
 * Alias matching the name used in the feature spec / cookbook
 * (`<UnsupportedMobileWebPreview componentName="BottomSheet" />`). Same
 * component, clearer call-site name for native-only styles.
 */
export const UnsupportedMobileWebPreview = WebPreviewUnsupported;
