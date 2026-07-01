/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Golden-style navigation wave checks: dual mobile surfaces, segmented siblings,
 * modal-vs-route, and holder redirects.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
    findPageRefInNavigationPayload,
    isBottomTabMenuItemActive,
    isOnAnyMobileMenuFromPayload,
    resolveHolderRedirectPath,
    resolveMobileSegmentGroup,
} from '@selfhelp/shared';

import {
    getBottomTabMenuItems,
    getDrawerMenuItems,
    isKeywordOnResolvedMobileMenu,
    resolvePageNavigation,
} from '../../components/shell/navigationUtils.ts';

const pages = [
    { id: 1, id_pages: 1, keyword: 'home', url: '/', is_headless: false, children: [] },
    {
        id: 4,
        id_pages: 4,
        keyword: 'team',
        url: '/team',
        is_headless: false,
        children: [
            { id: 5, id_pages: 5, keyword: 'people', url: '/team/people', is_headless: false, children: [] },
            { id: 6, id_pages: 6, keyword: 'roles', url: '/team/roles', is_headless: false, children: [] },
        ],
    },
];

const navigation = {
    menus: {
        mobile_drawer: {
            key: 'mobile_drawer',
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
                    page: { id: 4, keyword: 'team', url: '/team', title: 'Team', has_content: false },
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
        mobile_bottom_tabs: {
            key: 'mobile_bottom_tabs',
            item_limit: 5,
            items: [
                {
                    id: 10,
                    item_type: 'page',
                    label: 'Home',
                    position: 0,
                    page: { id: 1, keyword: 'home', url: '/', title: 'Home' },
                    children: [],
                },
            ],
        },
    },
    startup: {},
    search: { mode: 'content_index', min_chars: 2, result_limit: 8, default_visibility: 'all_accessible_pages', field_policy: 'all_display_text' },
};

test('drawer and bottom tabs both resolve from payload', () => {
    assert.equal(getDrawerMenuItems(navigation).length, 2);
    assert.equal(getBottomTabMenuItems(navigation).length, 1);
});

test('holder team page shows child segments when it has menu-visible children', () => {
    const segments = resolveMobileSegmentGroup(navigation, 4);
    assert.deepEqual(segments?.map((s) => s.keyword), ['people']);
    assert.equal(getBottomTabMenuItems(navigation).length, 1);
});

test('single sibling group is omitted when only one menu-visible child exists', () => {
    const segments = resolveMobileSegmentGroup(navigation, 5);
    assert.equal(segments, null);
});

test('page on drawer opens as route, off-menu page opens as modal', () => {
    assert.equal(
        resolvePageNavigation('/team/people', pages, navigation).kind,
        'route',
    );
    assert.equal(
        resolvePageNavigation('/secret', pages, navigation).kind,
        'modal',
    );
});

test('isKeywordOnResolvedMobileMenu delegates to shared membership helper', () => {
    assert.equal(isKeywordOnResolvedMobileMenu(pages, 'people', navigation), true);
    assert.equal(isKeywordOnResolvedMobileMenu(pages, 'secret', navigation), false);
});

test('holder redirect uses navigation has_content before page fetch', () => {
    const ref = findPageRefInNavigationPayload(navigation, 4);
    assert.equal(ref?.has_content, false);
    const target = resolveHolderRedirectPath(navigation, 4, 'mobile', false);
    assert.equal(target, '/people');
});

test('bottom tab active state matches its own route only', () => {
    const tabs = getBottomTabMenuItems(navigation);
    assert.equal(isBottomTabMenuItemActive(tabs[0], '/index'), true);
    assert.equal(isBottomTabMenuItemActive(tabs[0], '/team/people'), false);
});

test('page in drawer and not in tabs is still on-menu', () => {
    assert.equal(isOnAnyMobileMenuFromPayload(navigation, 5), true);
});
