/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Unit tests for `isKeywordOnResolvedMobileMenu` — the app-wide ON-MENU vs OFF-MENU decision.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
    isKeywordOnResolvedMobileMenu,
    resolvePageNavigation,
} from '../../components/shell/navigationUtils.ts';

const pages = [
    { id: 1, id_pages: 1, keyword: 'home', is_headless: false, children: [] },
    { id: 2, id_pages: 2, keyword: 'impressum', is_headless: false, children: [] },
    { id: 3, id_pages: 3, keyword: 'secret', is_headless: true, children: [] },
    {
        id: 4,
        id_pages: 4,
        keyword: 'team',
        is_headless: false,
        children: [{ id: 5, id_pages: 5, keyword: 'people', is_headless: false, children: [] }],
    },
];

const navigation = {
    menus: {
        mobile_drawer: {
            items: [
                {
                    id: 1,
                    item_type: 'page',
                    label: 'Home',
                    position: 0,
                    page: { id: 1, keyword: 'home', url: '/', title: 'Home' },
                    children: [],
                },
                {
                    id: 2,
                    item_type: 'page',
                    label: 'Team',
                    position: 10,
                    page: { id: 4, keyword: 'team', url: '/team', title: 'Team' },
                    children: [
                        {
                            id: 3,
                            item_type: 'page',
                            label: 'People',
                            position: 0,
                            page: { id: 5, keyword: 'people', url: '/team/people', title: 'People' },
                            children: [],
                        },
                    ],
                },
            ],
        },
        mobile_bottom_tabs: { items: [] },
        web_header: { items: [] },
        web_footer: { items: [] },
    },
    startup: {},
    search: { mode: 'off', min_chars: 2, result_limit: 10, default_visibility: 'inherit', field_policy: 'title' },
};

test('on-menu top-level page routes full-screen (isKeywordOnResolvedMobileMenu = true)', () => {
    assert.equal(isKeywordOnResolvedMobileMenu(pages, 'home', navigation), true);
    assert.equal(isKeywordOnResolvedMobileMenu(pages, 'team', navigation), true);
});

test('nested on-menu page is still on-menu', () => {
    assert.equal(isKeywordOnResolvedMobileMenu(pages, 'people', navigation), true);
});

test('footer-only / unassigned page is off-menu (→ modal)', () => {
    assert.equal(isKeywordOnResolvedMobileMenu(pages, 'impressum', navigation), false);
});

test('headless page is off-menu (→ modal)', () => {
    assert.equal(isKeywordOnResolvedMobileMenu(pages, 'secret', navigation), false);
});

test('unknown keyword is off-menu (→ modal, then not-found in the sheet)', () => {
    assert.equal(isKeywordOnResolvedMobileMenu(pages, 'does-not-exist', navigation), false);
});

test('resolvePageNavigation: on-menu target routes full-screen with URL-derived href', () => {
    assert.deepEqual(resolvePageNavigation('/team', pages, navigation), { kind: 'route', keyword: 'team', href: '/team' });
    assert.deepEqual(resolvePageNavigation('people', pages, navigation), { kind: 'route', keyword: 'people', href: '/people' });
    assert.deepEqual(resolvePageNavigation('/team/people', pages, navigation), { kind: 'route', keyword: 'people', href: '/people' });
});

test('resolvePageNavigation: empty/"/" target normalises to home (on-menu → route)', () => {
    assert.deepEqual(resolvePageNavigation('/', pages, navigation), { kind: 'route', keyword: 'home', href: '/index' });
    assert.deepEqual(resolvePageNavigation('', pages, navigation), { kind: 'route', keyword: 'home', href: '/index' });
});

test('resolvePageNavigation: off-menu target opens as a modal', () => {
    assert.deepEqual(resolvePageNavigation('/impressum', pages, navigation), { kind: 'modal', keyword: 'impressum' });
    assert.deepEqual(resolvePageNavigation('secret', pages, navigation), { kind: 'modal', keyword: 'secret' });
    assert.deepEqual(resolvePageNavigation('thank-you', pages, navigation), { kind: 'modal', keyword: 'thank-you' });
});

test('holder tab press resolves to first visible child route', async () => {
    const { resolveTabPressHref } = await import('../../components/shell/navigationUtils.ts');
    const holderItem = {
        id: 10,
        item_type: 'page',
        label: 'Team',
        position: 0,
        page: { id: 4, keyword: 'team', url: '/team', title: 'Team' },
        children: [
            {
                id: 11,
                item_type: 'page',
                label: 'People',
                position: 0,
                is_active: true,
                page: { id: 5, keyword: 'people', url: '/team/people', title: 'People' },
                children: [],
            },
        ],
    };
    assert.equal(resolveTabPressHref(holderItem), '/people');
});

test('drawer active trail auto-expands ancestors of the current page', async () => {
    const { expandedIdsForActiveTrail } = await import('@selfhelp/shared');
    const drawerItems = navigation.menus.mobile_drawer.items;
    assert.deepEqual([...expandedIdsForActiveTrail(drawerItems, '/people', 'mobile')], [2]);
    assert.deepEqual([...expandedIdsForActiveTrail(drawerItems, '/index', 'mobile')], []);
});

test('bottom tabs are sliced to the menu item_limit', async () => {
    const { getBottomTabMenuItems } = await import('../../components/shell/navigationUtils.ts');
    const tabItem = (id, keyword) => ({
        id,
        item_type: 'page',
        label: keyword,
        position: id,
        page: { id, keyword, url: `/${keyword}`, title: keyword },
        children: [],
    });
    const limited = {
        ...navigation,
        menus: {
            ...navigation.menus,
            mobile_bottom_tabs: {
                item_limit: 2,
                items: [tabItem(1, 'one'), tabItem(2, 'two'), tabItem(3, 'three')],
            },
        },
    };
    assert.deepEqual(
        getBottomTabMenuItems(limited).map((item) => item.page.keyword),
        ['one', 'two'],
    );
});

test('page in both drawer and bottom tabs is on-menu from either surface', async () => {
    const { isOnAnyMobileMenuFromPayload } = await import('@selfhelp/shared');
    const dualNavigation = {
        ...navigation,
        menus: {
            ...navigation.menus,
            mobile_bottom_tabs: {
                items: [
                    {
                        id: 99,
                        item_type: 'page',
                        label: 'Home tab',
                        position: 0,
                        page: { id: 1, keyword: 'home', url: '/', title: 'Home' },
                        children: [],
                    },
                ],
            },
        },
    };
    assert.equal(isOnAnyMobileMenuFromPayload(dualNavigation, 1), true);
});

test('active ancestor in drawer is detectable for nested people page', async () => {
    const { findPageRefInNavigationPayload } = await import('@selfhelp/shared');
    const ref = findPageRefInNavigationPayload(navigation, 5);
    assert.equal(ref?.keyword, 'people');
    const teamRef = findPageRefInNavigationPayload(navigation, 4);
    assert.equal(teamRef?.keyword, 'team');
});

test('off-menu page opens modal while drawer+bottom tabs remain available', () => {
    assert.deepEqual(resolvePageNavigation('/impressum', pages, navigation), { kind: 'modal', keyword: 'impressum' });
    assert.equal(isKeywordOnResolvedMobileMenu(pages, 'home', navigation), true);
});

test('self segment is prepended when tab page has content and children', async () => {
    const { resolveMobileSegmentGroup } = await import('@selfhelp/shared');
    const navigation = {
        menus: {
            mobile_drawer: { items: [] },
            mobile_bottom_tabs: {
                items: [
                    {
                        id: 1,
                        item_type: 'page',
                        label: 'Root',
                        position: 0,
                        page: { id: 4, keyword: 'team', url: '/team', title: 'Team', has_content: true },
                        children: [
                            {
                                id: 2,
                                item_type: 'page',
                                label: 'People',
                                position: 0,
                                page: { id: 5, keyword: 'people', url: '/team/people', title: 'People' },
                                children: [],
                            },
                        ],
                    },
                ],
            },
            web_header: { items: [] },
            web_footer: { items: [] },
        },
        startup: {},
        search: { mode: 'off', min_chars: 2, result_limit: 10, default_visibility: 'inherit', field_policy: 'title' },
    };
    const segments = resolveMobileSegmentGroup(navigation, 4);
    assert.deepEqual(segments?.map((segment) => segment.keyword), ['team', 'people']);
});

test('startup last-visited snapshot is exposed when present', () => {
    const withLastVisited = {
        ...navigation,
        startup: {
            web_user_last_visited_page: { page_id: 2, keyword: 'impressum', url: '/impressum' },
        },
    };
    assert.deepEqual(withLastVisited.startup.web_user_last_visited_page?.keyword, 'impressum');
});
