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

import {
    isKeywordOnMenu,
    resolvePageNavigation,
} from '../../components/shell/navigationUtils.ts';

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

/**
 * `resolvePageNavigation` is the GLOBAL decision every "load a page" entry point
 * runs (links, buttons, action icons, form redirects, plugin/survey host
 * redirects). Off-menu → modal, on-menu → full-screen route, and unknown-until-
 * loaded → route so a real menu link is never trapped behind a modal.
 */
test('resolvePageNavigation: on-menu target routes full-screen', () => {
    assert.deepEqual(resolvePageNavigation('/team', pages), { kind: 'route', keyword: 'team' });
    assert.deepEqual(resolvePageNavigation('people', pages), { kind: 'route', keyword: 'people' });
});

test('resolvePageNavigation: empty/"/" target normalises to home (on-menu → route)', () => {
    assert.deepEqual(resolvePageNavigation('/', pages), { kind: 'route', keyword: 'home' });
    assert.deepEqual(resolvePageNavigation('', pages), { kind: 'route', keyword: 'home' });
});

test('resolvePageNavigation: off-menu target opens as a modal', () => {
    assert.deepEqual(resolvePageNavigation('/impressum', pages), { kind: 'modal', keyword: 'impressum' });
    assert.deepEqual(resolvePageNavigation('secret', pages), { kind: 'modal', keyword: 'secret' });
    assert.deepEqual(resolvePageNavigation('thank-you', pages), { kind: 'modal', keyword: 'thank-you' });
});

test('resolvePageNavigation: unknown until pages load routes full-screen (never trapped)', () => {
    assert.deepEqual(resolvePageNavigation('/impressum', undefined), {
        kind: 'route',
        keyword: 'impressum',
    });
});
