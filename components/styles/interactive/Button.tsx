/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Linking } from 'react-native';
import type { IStyleProps } from '@/components/renderer/types';
import { MobileButton } from '@/components/ui/adapters';
import { mobileStyleProps } from '@/components/ui/mobileStyleProps';
import { isExternalNavigationUrl } from '@/components/shell/externalUrl';
import { usePageNavigation } from '@/components/shell/usePageNavigation';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readBooleanField, readField, useInterpolatedField } from '@/components/renderer/useField';

export function Button({ section, values }: IStyleProps): React.ReactElement {
    const navigateToPage = usePageNavigation();
    const resolved = mobileStyleProps(section);
    const label = useInterpolatedField(section, 'label', values);
    const disabled = resolved.isDisabled ?? readBooleanField(section, 'disabled', false);
    const isLink = readBooleanField(section, 'is_link', true);
    const url = useInterpolatedField(section, 'url', values);
    const pageKeyword = useInterpolatedField(section, 'page_keyword', values);
    const openInNewTab = readBooleanField(section, 'open_in_new_tab', false);
    // mobile-only: native press feedback. Empty falls back to scale-highlight.
    const feedbackVariant = (readField<string>(section, 'mobile_button_feedback') || undefined) as
        | 'scale-highlight' | 'scale-ripple' | 'scale' | 'none' | undefined;

    const onPress = (): void => {
        if (!isLink || disabled) return;
        // Internal page targets go through the shared navigator so OFF-MENU pages
        // open as a modal sheet (app-wide rule); external URLs open in the OS.
        if (pageKeyword) {
            navigateToPage(pageKeyword);
            return;
        }
        if (url) {
            if (openInNewTab || isExternalNavigationUrl(url)) void Linking.openURL(url);
            else navigateToPage(url);
        }
    };

    // Renders through the swappable HeroUI Native button adapter (intent/size
    // resolved by the shared semantic mapper) on every platform, including web.
    // HeroUI Native **Pro** override (RF-32): `ProgressButton` / `SlideButton` /
    // `SocialAuthButton` / `ToggleButton(+Group)` — opt-in via `variant`
    // or dedicated styles; the Pro adapter swaps the base button where applicable.
    return (
        <MobileButton
            label={label}
            onPress={onPress}
            isDisabled={disabled}
            variant={resolved.buttonVariant ?? 'primary'}
            size={resolved.size ?? 'md'}
            fullWidth={resolved.fullWidth}
            feedbackVariant={feedbackVariant}
            className={buildSectionClasses(section)}
            accessibilityLabel={label}
        />
    );
}
