/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Live sync, mobile: what the open page screen does with a refetch (P5-A5, P5-A6).
 *
 * - `X-Page-View: 1` goes out only on the fetch that opens a screen (A5).
 * - Lost access keeps the page with a notice; a flaky read keeps it too.
 * - A form the person is typing in keeps its input when the page is read again; a section that vanishes
 *   while its form has unsaved input leaves a notice (A6).
 * - A quick action's new version is in the list rows at once, so a Delete right after it is not refused (F186).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { pageViewHeaders, shouldCountPageView } from '../../services/pageViewPolicy.ts';
import { pageScreenOutcome } from '../../services/pageScreenOutcome.ts';
import { mergeRefreshedInitialValues } from '../../components/styles/forms/formFields.ts';
import {
    createPageDirtyRegistry,
    findVanishedDirtySections,
    isUnanchored,
    keepVanished,
    placeNotices,
} from '../../components/renderer/vanishedSectionLogic.ts';
import { rememberRecordVersion, withRecordVersion } from '../../services/formListQueryKeys.ts';
import { pageFromPayload } from '@selfhelp/shared';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const source = (path) => readFileSync(join(root, path), 'utf8');

test('a screen counts the view of its page once, and never a refetch', () => {
    const opening = { countView: true, preview: false, countedIdentity: null, identity: 'home|' };
    assert.equal(shouldCountPageView(opening), true);
    assert.equal(shouldCountPageView({ ...opening, countedIdentity: 'home|' }), false, 'a live refetch');
    assert.equal(shouldCountPageView({ ...opening, countedIdentity: 'home|', identity: 'about|' }), true, 'another page');
    assert.equal(shouldCountPageView({ ...opening, countView: false }), false, 'a background reader');
    assert.equal(shouldCountPageView({ ...opening, preview: true }), false, 'a draft is not a visit');
});

test('the header is sent only when the fetch is a view', () => {
    assert.deepEqual(pageViewHeaders(true), { 'X-Page-View': '1' });
    assert.equal(pageViewHeaders(false), undefined);
    assert.equal(pageViewHeaders(undefined), undefined);
});

test('the page service sends the view header, and only the screens ask for it', () => {
    const service = source('services/pageService.ts');
    assert.equal((service.match(/pageViewHeaders\(options\.view\)/g) ?? []).length, 2);
    for (const file of [
        'components/renderer/CmsPageScreen.tsx',
        'app/(public)/login.tsx',
        'components/shell/ProfileContent.tsx',
        'components/styles/auth/LoginAuxModal.tsx',
    ]) {
        assert.match(source(file), /usePageContent\([^)]*countView: true/, file);
    }
    const hook = source('hooks/usePageContent.ts');
    assert.match(hook, /shouldCountPageView/);
    assert.match(hook, /refetchOnMount: countView \? 'always' : true/);
});

test('a page that is on screen stays when the read is refused, with a notice', () => {
    const base = { isLoading: false, hasData: true, status: null, hasError: false };
    assert.equal(pageScreenOutcome({ ...base, isLoading: true, hasData: false }), 'loading');
    assert.equal(pageScreenOutcome(base), 'page');
    for (const status of [401, 403, 404]) {
        assert.equal(pageScreenOutcome({ ...base, hasError: true, status }), 'page-lost-access', String(status));
    }
    assert.equal(pageScreenOutcome({ ...base, hasError: true, status: 500 }), 'page', 'a flaky read keeps the page');
    assert.equal(pageScreenOutcome({ ...base, hasData: false, hasError: true, status: 403 }), 'error');
});

test('typed input is kept when the page is read again; untouched fields take the new value', () => {
    const previous = { title: 'old', note: '' };
    const next = { title: 'new', note: 'from server' };
    const current = { title: 'old', note: 'my own words' };
    assert.deepEqual(mergeRefreshedInitialValues(previous, next, current), {
        title: 'new',
        note: 'my own words',
    });
});

test('a vanished section with a dirty form leaves a notice where it was, a clean one leaves nothing', () => {
    const before = [{ id: 1 }, { id: 2, children: [{ id: 21 }] }, { id: 3 }];
    const after = [{ id: 1 }, { id: 3 }];
    const registry = createPageDirtyRegistry();
    registry.register(21, () => true);

    const ghosts = findVanishedDirtySections(before, after, registry.isDirty);
    assert.deepEqual(ghosts, [{ id: 2, beforeId: 3, afterId: 1 }], 'one notice for the container');
    assert.deepEqual(findVanishedDirtySections(before, after, () => false), []);

    const placed = placeNotices(after, ghosts).map((item) => (item.kind === 'section' ? item.section.id : `notice-${item.ghost.id}`));
    assert.deepEqual(placed, [1, 'notice-2', 3]);
});

test('a notice stays until its section is back, and a page of one section keeps the notice at the top', () => {
    const ghost = { id: 2, beforeId: null, afterId: null };
    assert.equal(isUnanchored(ghost), true);
    assert.deepEqual(keepVanished([ghost], [], [{ id: 1 }]), [ghost]);
    assert.deepEqual(keepVanished([ghost], [], [{ id: 1 }, { id: 2 }]), []);
});

test('a notice after the last sibling is drawn at the end', () => {
    const ghost = { id: 9, beforeId: null, afterId: 2 };
    const placed = placeNotices([{ id: 1 }, { id: 2 }], [ghost]).map((item) => (item.kind === 'section' ? item.section.id : 'notice'));
    assert.deepEqual(placed, [1, 2, 'notice']);
});

test('the registry withdraws the check of a form that unmounts', () => {
    const registry = createPageDirtyRegistry();
    const withdraw = registry.register(5, () => true);
    assert.equal(registry.isDirty(5), true);
    withdraw();
    assert.equal(registry.isDirty(5), false);
});

const listState = (version) => ({
    rows: [
        { record_id: 7, version },
        { record_id: 8, version: 1 },
    ],
    selected: { record_id: 7, version },
});

test('F186: a record that a quick action changed names its new version in the rows and the open record', () => {
    const updated = withRecordVersion(listState(2), 7, 3);
    assert.equal(updated.rows[0].version, 3);
    assert.equal(updated.rows[1].version, 1);
    assert.equal(updated.selected.version, 3);
});

test('F186: a list that does not show the record, or already has the version, is returned unchanged', () => {
    const state = listState(2);
    assert.equal(withRecordVersion(state, 99, 5), state);
    assert.equal(withRecordVersion(state, 7, 2), state);
});

test('F186: the new version is written into every cached list, and the quick action does it before the read', () => {
    const cached = new Map([
        [['form-list', 'a'], listState(2)],
        [['form-list', 'b'], undefined],
    ]);
    const cache = {
        setQueriesData(filters, updater) {
            assert.deepEqual(filters, { queryKey: ['form-list'] });
            for (const [key, data] of cached) {
                cached.set(key, updater(data));
            }
        },
    };
    rememberRecordVersion(cache, 7, 3);
    const [[, first], [, second]] = [...cached];
    assert.equal(first.rows[0].version, 3);
    assert.equal(second, undefined);

    const hooks = source('components/styles/composite/FormList/FormList.hooks.ts');
    assert.match(hooks, /rememberRecordVersion\(queryClient, data\.record_id, data\.version\);\s*invalidateFormListQueries/);
});

test('the page keeps the sync block that the server sends next to it, so a changed message finds the page', () => {
    const page = { id: 12, keyword: 'impressum', sections: [] };
    const sync = { depends_on: ['page:12', 'table:31', 'global_values'], valid_until: '2026-12-01T00:00:00Z' };

    assert.deepEqual(pageFromPayload({ page, sync }), { ...page, sync });
    assert.deepEqual(pageFromPayload({ page: { ...page, sync } }), { ...page, sync }, 'a block already on the page stays');
    assert.equal(pageFromPayload({ page }), page, 'no block at all');
    assert.equal(pageFromPayload({ page: null, sync }), null);
    assert.equal(pageFromPayload(undefined), null);
    assert.match(source('services/pageService.ts'), /pageFromPayload\(resp\.data\.data\)/, 'both fetchers go through it');
    assert.match(
        source('services/pageService.ts'),
        /pageFromPayload/,
        'pageService imports pageFromPayload from shared',
    );
    assert.doesNotMatch(
        source('services/pageService.ts'),
        /from ['"]@\/services\/pagePayload['"]/,
        'no local pagePayload import remains',
    );
});
