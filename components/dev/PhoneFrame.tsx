/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Device-shaped viewport frame for the web preview.
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
 *   - Uses fixed phone/tablet dimensions for predictable QA.
 *   - Portrait/landscape is handled by swapping width/height.
 *   - Each dimension is capped to the browser viewport minus a small
 *     gutter, so a narrow window doesn't push past the edges.
 *
 * Native (iOS / Android) and production builds: this component is a
 * no-op.
 */

import { useEffect } from 'react';
import { Platform } from 'react-native';

import { runtimeConfig } from '@/config/runtime';
import { useDevModeStore, type TPreviewDevice, type TPreviewOrientation } from '@/stores/devModeStore';

const STYLE_TAG_ID = 'sh-phone-frame-style';
const ROOT_SELECTOR = 'body > #root, body > #__next';
const PORTAL_SELECTOR = 'body > div:not(#root):not(#__next)';

interface IDeviceSize {
    width: number;
    height: number;
    radius: number;
    border: number;
    portraitMaxWidth?: number;
}

const DEVICE_SIZES: Record<TPreviewDevice, IDeviceSize> = {
    phone: { width: 390, height: 844, radius: 36, border: 8 },
    tablet: { width: 820, height: 1180, radius: 32, border: 10, portraitMaxWidth: 720 },
};

/**
 * Device frame is applied via targeted rules:
 *
 *   1. `html, body` get a dark backdrop and become a flex container so
 *      the root is centered on the page.
 *   2. The Expo Router root container (`#root` on Expo web, fallback
 *      `#__next`) is sized like the selected device and clipped.
 *   3. Web portal siblings (for modals / overlays) are forced into the
 *      same fixed viewport so nothing can render outside the device.
 *
 * We deliberately do NOT use `body > div` because Expo / React Native
 * Web mounts a couple of portal containers as siblings of the main
 * root (animations, modals). Styling all of them produced three frames
 * in the previous iteration.
 */
function buildFrameCss(device: TPreviewDevice, orientation: TPreviewOrientation): string {
    const base = DEVICE_SIZES[device];
    const width = orientation === 'portrait' ? base.width : base.height;
    const height = orientation === 'portrait' ? base.height : base.width;
    const portraitCap =
        orientation === 'portrait' && base.portraitMaxWidth
            ? `, ${base.portraitMaxWidth}px`
            : '';
    const widthExpression = `min(${width}px, calc(100vw - 32px), calc((100vh - 32px) * ${width} / ${height})${portraitCap})`;

    return `
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
        --sh-frame-width: ${widthExpression} !important;
        --sh-frame-aspect-ratio: ${width} / ${height} !important;
        --sh-frame-radius: ${base.radius}px !important;
        --sh-frame-border: ${base.border}px !important;
    }
    ${ROOT_SELECTOR},
    ${PORTAL_SELECTOR} {
        flex: 0 0 auto !important;
        flex-grow: 0 !important;
        flex-shrink: 0 !important;
        width: var(--sh-frame-width) !important;
        min-width: var(--sh-frame-width) !important;
        max-width: var(--sh-frame-width) !important;
        aspect-ratio: var(--sh-frame-aspect-ratio) !important;
        height: auto !important;
        min-height: auto !important;
        max-height: calc(100vh - 32px) !important;
        border-radius: var(--sh-frame-radius) !important;
        overflow: hidden !important;
        background-color: #ffffff !important;
        box-sizing: border-box !important;
        position: relative !important;
    }
    ${ROOT_SELECTOR} {
        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.4) !important;
        border: var(--sh-frame-border) solid #1f2933 !important;
    }
    ${PORTAL_SELECTOR} {
        position: fixed !important;
        left: 50% !important;
        top: 50% !important;
        transform: translate(-50%, -50%) !important;
        background: transparent !important;
        z-index: 9998 !important;
        pointer-events: none !important;
    }
    ${PORTAL_SELECTOR} > * {
        pointer-events: auto !important;
    }
`;
}

export function PhoneFrame(): React.ReactElement | null {
    if (Platform.OS !== 'web') return null;
    if (!runtimeConfig.isDevInstance) return null;
    return <PhoneFrameInner />;
}

function PhoneFrameInner(): React.ReactElement | null {
    const enabled = useDevModeStore((s) => s.deviceFrameEnabled);
    const device = useDevModeStore((s) => s.previewDevice);
    const orientation = useDevModeStore((s) => s.previewOrientation);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        const existing = document.getElementById(STYLE_TAG_ID);
        if (!enabled) {
            if (existing) existing.remove();
            return;
        }
        const tag = existing ?? document.createElement('style');
        tag.id = STYLE_TAG_ID;
        tag.innerHTML = buildFrameCss(device, orientation);
        if (!existing) document.head.appendChild(tag);
        return () => {
            tag.remove();
        };
    }, [device, enabled, orientation]);

    return null;
}
