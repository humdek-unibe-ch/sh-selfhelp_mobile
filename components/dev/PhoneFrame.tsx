/**
 * Phone-shaped viewport wrapper for the web preview.
 *
 * On native (iOS / Android) this component is a no-op — the OS already
 * gives us the right viewport. It is only used when running the app on
 * the web preview build that doubles as a "preview your CMS site"
 * deployment.
 *
 * In dev/preview builds the wrapper:
 *
 *   - Constrains the inner viewport to a phone-sized rect (default
 *     iPhone 14: 390 × 844 logical px).
 *   - Adds a subtle device chrome (shadow, rounded corners, dark
 *     surrounding background) so it's obvious you're previewing on
 *     mobile geometry.
 *   - Listens to the dev-mode toggle (`useDevModeStore.phoneFrame`) so
 *     the user can flip to a fullscreen browser viewport for QA.
 *
 * On very narrow desktop viewports we fall back to fullscreen so we
 * don't double-clip on phones used for the preview deployment.
 */

import { Platform, useWindowDimensions, View } from 'react-native';
import type { ReactNode } from 'react';

import { runtimeConfig } from '@/config/runtime';
import { useDevModeStore } from '@/stores/devModeStore';

interface IPhoneFrameProps {
    children: ReactNode;
}

const FRAME_WIDTH = 390;
const FRAME_HEIGHT = 844;

export function PhoneFrame({ children }: IPhoneFrameProps): React.ReactElement {
    if (Platform.OS !== 'web') return <>{children}</> as unknown as React.ReactElement;
    if (!runtimeConfig.isDevInstance) return <>{children}</> as unknown as React.ReactElement;
    return <PhoneFrameInner>{children}</PhoneFrameInner>;
}

function PhoneFrameInner({ children }: IPhoneFrameProps): React.ReactElement {
    const phoneFrame = useDevModeStore((s) => s.phoneFrame);
    const { width: vw, height: vh } = useWindowDimensions();

    const tooNarrow = vw < FRAME_WIDTH + 80;
    const enabled = phoneFrame && !tooNarrow;

    if (!enabled) return <>{children}</> as unknown as React.ReactElement;

    return (
        <View
            style={{
                flex: 1,
                width: '100%',
                height: '100%',
                backgroundColor: '#0b0d0f',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <View
                style={{
                    width: FRAME_WIDTH,
                    height: Math.min(FRAME_HEIGHT, vh - 32),
                    borderRadius: 40,
                    overflow: 'hidden',
                    backgroundColor: '#fff',
                    borderWidth: 8,
                    borderColor: '#1f2933',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 0.35,
                    shadowRadius: 32,
                    elevation: 12,
                }}
            >
                {children}
            </View>
        </View>
    );
}
