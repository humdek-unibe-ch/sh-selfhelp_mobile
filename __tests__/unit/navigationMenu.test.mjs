/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Unit tests for `isKeywordOnMenu` — the app-wide ON-MENU vs OFF-MENU decision.
 *
 * This is the rule that decides modal-vs-full-screen for BOTH normal in-app
 * navigation (`components/shell/usePageNavigation.ts`) and the CMS Live Preview
 * sync bridge (`components/preview/PreviewSyncBridge.tsx`): an OFF-MENU page
 * (footer-only / unassigned / headless / unknown) must open as a MODAL sheet,
 * while an ON-MENU page routes full-screen. Pinning it here guards the preview
 * "off-menu pages open as a modal" contract against menu-detection regressions.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { isKeywordOnMenu } from '../../components/shell/navigationUtils.ts';

const pages = [
    { keyword: 'home', navPosition: 0, is_headless: false, children: [] },
    // Footer-only / unassigned → off-menu → modal.
    { keyword: 'impressum', navPosition: null, is_headless: false, children: [] },
    // Headless content fragment → never on the menu.
    { keyword: 'secret', navPosition: null, is_headless: true, children: [] },
    {
        keyword: 'team',
        navPosition: 1,
        is_headless: false,
        children: [{ keyword: 'people', navPosition: 0, is_headless: false, children: [] }],
    },
];

test('on-menu top-level page routes full-screen (isKeywordOnMenu = true)', () => {
    assert.equal(isKeywordOnMenu(pages, 'home'), true);
    assert.equal(isKeywordOnMenu(pages, 'team'), true);
});

test('nested on-menu page is still on-menu', () => {
    assert.equal(isKeywordOnMenu(pages, 'people'), true);
});

test('footer-only / unassigned page is off-menu (→ modal)', () => {
    assert.equal(isKeywordOnMenu(pages, 'impressum'), false);
});

test('headless page is off-menu (→ modal)', () => {
    assert.equal(isKeywordOnMenu(pages, 'secret'), false);
});

test('unknown keyword is off-menu (→ modal, then not-found in the sheet)', () => {
    assert.equal(isKeywordOnMenu(pages, 'does-not-exist'), false);
});
