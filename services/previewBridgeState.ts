/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Pure startup rules for the embedded CMS Live Preview bridge.
 *
 * The bridge listener may be installed during bootstrap, but READY must not be
 * announced until the initial preview route is visible. Otherwise the shell
 * immediately answers READY with NAVIGATE while GateController is issuing its
 * own initial router.replace(), and the two competing replaces can flood the
 * Expo web router until Chromium throttles navigation. For the same reason,
 * temporary startup routes must not be reported as NAVIGATED before READY.
 */

interface IPreviewBridgeReadyOptions {
    active: boolean;
    alreadySent: boolean;
    serverHydrated: boolean;
    authBootstrapped: boolean;
    currentKeyword: string | null;
    initialKeyword: string | null;
}

export function shouldAnnouncePreviewReady(
    options: IPreviewBridgeReadyOptions,
): boolean {
    if (!options.active || options.alreadySent) return false;
    if (!options.serverHydrated || !options.authBootstrapped) return false;
    return options.currentKeyword === options.initialKeyword;
}

interface IPreviewNavigationReportOptions {
    active: boolean;
    readySent: boolean;
    currentKeyword: string | null;
    lastSentKeyword: string | null | undefined;
}

export function shouldReportPreviewNavigation(
    options: IPreviewNavigationReportOptions,
): boolean {
    if (!options.active || !options.readySent) return false;
    return options.lastSentKeyword !== options.currentKeyword;
}
