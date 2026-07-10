/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/

/**
 * True when a CMS link/button URL should open in the OS (or in-app browser)
 * instead of the page navigator. Covers http(s) plus common app schemes used
 * in CMS-in-CMS templates (`mailto:`, `tel:`, `sms:`).
 */
export function isExternalNavigationUrl(url: string): boolean {
    const trimmed = url.trim();
    if (trimmed === '') {
        return false;
    }
    return /^(https?:|mailto:|tel:|sms:)/i.test(trimmed);
}
