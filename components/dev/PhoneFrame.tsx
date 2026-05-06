/**
 * Phone-shaped viewport frame for the web preview.
 *
 * Implementation note: the previous version wrapped `<Stack>` in a
 * custom `<View>` to crop the viewport. That works for plain React,
 * but Expo Router's web root container needs an unconstrained parent
 * to mount the navigator correctly — wrapping it produced a blank
 * page on first mount. So instead we inject a `<style>` tag that
 * constrains `<body>` and the root container via CSS, and render no
 * JSX at all. The React tree is untouched; only the visible chrome is
 * tweaked. Toggling the frame on/off is just inserting/removing the
 * tag.
 *
 * Geometry:
 *
 *   - Use as much vertical space as possible — content height is
 *     `100vh - top - bottom`.
 *   - Width is derived from a 9 : 19.5 aspect ratio (iPhone 14/15
 *     class), so the frame looks like a real modern phone.
 *   - Capped to the browser viewport width minus a small horizontal
 *     gutter, so a narrow window doesn't push past the edges.
 *
 * Native (iOS / Android) and production builds: this component is a
 * no-op.
 */

import { useEffect } from 'react';
import { Platform } from 'react-native';

import { runtimeConfig } from '@/config/runtime';
import { useDevModeStore } from '@/stores/devModeStore';

const STYLE_TAG_ID = 'sh-phone-frame-style';

/**
 * Phone frame is applied via two targeted rules:
 *
 *   1. `html, body` get a dark backdrop and become a flex container so
 *      the root is centered on the page.
 *   2. The Expo Router root container (`#root` on Expo web, fallback
 *      `#__next`) is sized like a phone — height fills the viewport
 *      minus a 16px gutter, width derived from a 9 : 19.5 modern phone
 *      aspect ratio, capped to the viewport.
 *
 * We deliberately do NOT use `body > div` because Expo / React Native
 * Web mounts a couple of portal containers as siblings of the main
 * root (animations, modals). Styling all of them produced three frames
 * in the previous iteration.
 */
const FRAME_CSS = `
    html, body {
        background-color: #0b0d0f !important;
        margin: 0 !important;
        padding: 0 !important;
        height: 100% !important;
        min-height: 100% !important;
    }
    body {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        overflow: hidden !important;
    }
    body > #root,
    body > #__next {
        flex: 0 0 auto !important;
        flex-grow: 0 !important;
        flex-shrink: 0 !important;
        height: calc(100vh - 32px) !important;
        max-height: calc(100vh - 32px) !important;
        aspect-ratio: 9 / 19.5 !important;
        width: auto !important;
        max-width: calc(100vw - 32px) !important;
        border-radius: 36px !important;
        overflow: hidden !important;
        background-color: #ffffff !important;
        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.4) !important;
        border: 8px solid #1f2933 !important;
        box-sizing: border-box !important;
        position: relative !important;
    }
    /* Pin sibling portal/modal containers behind the frame so they
       don't show as duplicate empty rectangles. */
    body > div:not(#root):not(#__next) {
        position: fixed !important;
        inset: 0 !important;
        pointer-events: none !important;
        background: transparent !important;
    }
`;

export function PhoneFrame(): React.ReactElement | null {
    if (Platform.OS !== 'web') return null;
    if (!runtimeConfig.isDevInstance) return null;
    return <PhoneFrameInner />;
}

function PhoneFrameInner(): React.ReactElement | null {
    const enabled = useDevModeStore((s) => s.phoneFrame);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        const existing = document.getElementById(STYLE_TAG_ID);
        if (!enabled) {
            if (existing) existing.remove();
            return;
        }
        if (existing) return;
        const tag = document.createElement('style');
        tag.id = STYLE_TAG_ID;
        tag.innerHTML = FRAME_CSS;
        document.head.appendChild(tag);
        return () => {
            tag.remove();
        };
    }, [enabled]);

    return null;
}
