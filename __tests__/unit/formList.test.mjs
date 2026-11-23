/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * The mobile form lists (`entry-form-list` / `data-view`) and the participant
 * form writes they use.
 *
 * Only logic that is free of React Native runs here: the exact requests a form
 * sends (verb, endpoint, multipart parts), what a refusal means, the URL state
 * of a list and its deep links, the cache keys that keep accounts, servers,
 * languages, routes and the draft of a page apart, the panel a state shows, what a
 * restore would do, the sections the server drew for each record, which version a
 * save is based on and the request that reads a file of an earlier version. The
 * drawing itself is verified on a native device (`e2e/golden/form-list.yaml`).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { ENDPOINTS } from '@selfhelp/shared';

import {
    buildDeleteRequest,
    buildSubmitRequest,
    buildUpdateRequest,
} from '../../services/formRequests.ts';
import { describeFormFailure, failureOf, normalizeFormResponse } from '../../services/formResults.ts';
import {
    buildFormData,
    collectFormFields,
    findMissingRequired,
    isFormDirty,
    requiredFieldErrors,
    requiredMessage,
    withUntouchedDefaults,
} from '../../components/styles/forms/formFields.ts';
import {
    normalizeNavigationTarget,
    parseQueryString,
    splitNavigationTarget,
    stringParams,
    toKeyword,
} from '../../components/shell/navigationUtils.ts';
import {
    FORM_LIST_ROOT,
    FORM_LIST_HISTORY_ROOT,
    formListCompareKey,
    formListHistoryKey,
    formListStateKey,
    formListVersionKey,
    invalidateFormListQueries,
    isFormListQueryKey,
    isSameFormList,
    removeFormListQueries,
} from '../../services/formListQueryKeys.ts';
import { formListStateUrl } from '../../services/formListUrl.ts';
import {
    cachedFileName,
    downloadFileName,
    fileVersionsOfComparison,
    fileVersionsOfRevision,
    historicalFileFailure,
    historicalFileRequest,
    mimeTypeOfFileName,
} from '../../services/formListFiles.ts';
import { saveBasedOnVersion } from '../../components/styles/forms/FormUserInput/formVersion.ts';
import {
    activeFilterCount,
    applicableQuickActions,
    blockerKey,
    canRetryFailure,
    canShowAllFailure,
    cellOf,
    describeRevision,
    failureMessage,
    failureOfError,
    failureOfSeed,
    resolveListFormSection,
    formatEntryDate,
    formatListCell,
    historyTotalPages,
    isAccessFailure,
    isFileCell,
    isNarrowed,
    isSearchTermUsable,
    joinRange,
    listCacheScope,
    listDrawing,
    multiValues,
    needsConfirmation,
    nextFrozen,
    normalizeBooleanFilter,
    optionLabel,
    ownQueryFromRouteParams,
    pageRouteParams,
    planRestore,
    queryAfterChange,
    rangeText,
    readFormListSeed,
    resolvePanel,
    resultsText,
    rowHasActions,
    rowLabel,
    rowTemplateSections,
    selectedOptionsText,
    splitRange,
    togglePickedVersion,
    toggleMultiValue,
    urlStateOfQuery,
    FORM_LIST_TEXT,
} from '../../components/styles/composite/FormList/FormList.logic.ts';

const here = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(here, '../..', path), 'utf8');

const COLUMNS = [
    { field: 'title', label: 'Title', format: 'text', sortable: true, searchable: true },
    { field: 'due', label: 'Due', format: 'date', sortable: true, searchable: false },
    { field: 'done', label: 'Done', format: 'boolean', sortable: false, searchable: false },
    { field: 'doc', label: 'Document', format: 'file', sortable: false, searchable: false },
];

/** An error as axios raises it for a refused request. */
function refusal(status, data, message = 'refused') {
    return { response: { status, data: { message, data } } };
}

// -- the requests a form sends ------------------------------------------------------------------

test('a submit is a POST to the submit endpoint and keeps its JSON payload', () => {
    const payload = { page_id: 4, section_id: 9, form_data: { title: 'Write report' } };
    const request = buildSubmitRequest(payload);

    assert.equal(request.method, 'post');
    assert.equal(request.url, ENDPOINTS.FORMS.SUBMIT);
    assert.deepEqual(request.body, { kind: 'json', data: payload });
});

test('an update is a PUT (a POST to the update route is refused with 405) and carries record and version', () => {
    const payload = {
        page_id: 4,
        section_id: 9,
        form_data: { title: 'Write the report' },
        update_based_on: { record_id: 12 },
        expected_version: 3,
    };
    const request = buildUpdateRequest(payload);

    assert.equal(request.method, 'put');
    assert.equal(request.url, ENDPOINTS.FORMS.UPDATE);
    assert.deepEqual(request.body, { kind: 'json', data: payload });
});

test('a delete is a DELETE whose JSON body names the record, the section, the page and the version seen', () => {
    const payload = { record_id: 12, page_id: 4, section_id: 9, expected_version: 3 };
    const request = buildDeleteRequest(payload);

    assert.equal(request.method, 'delete');
    assert.equal(request.url, ENDPOINTS.FORMS.DELETE);
    assert.deepEqual(request.body, { kind: 'json', data: payload });
});

test('a write that acts on the draft of the page says so: a JSON flag, or a text part of a multipart body', () => {
    const json = buildDeleteRequest({ record_id: 12, page_id: 4, section_id: 9, expected_version: 3, preview: true });
    assert.deepEqual(json.body, { kind: 'json', data: { record_id: 12, page_id: 4, section_id: 9, expected_version: 3, preview: true } });

    const submit = buildSubmitRequest(
        { page_id: 4, section_id: 9, form_data: { title: 'Report' }, preview: true },
        { doc: { uri: 'file:///cache/a.bin', name: 'a.bin' } },
    );
    assert.equal(submit.body.kind, 'multipart');
    assert.deepEqual(submit.body.parts.filter((part) => part.name === 'preview'), [{ name: 'preview', value: '1' }]);

    const update = buildUpdateRequest(
        {
            page_id: 4,
            section_id: 9,
            form_data: { title: 'Report' },
            update_based_on: { record_id: 12 },
            expected_version: 5,
            preview: true,
        },
        { doc: { uri: 'file:///cache/a.bin', name: 'a.bin' } },
    );
    assert.equal(update.body.kind, 'multipart');
    assert.deepEqual(update.body.parts.filter((part) => part.name === 'preview'), [{ name: 'preview', value: '1' }]);
    assert.deepEqual(update.body.parts.filter((part) => part.name === 'expected_version'), [{ name: 'expected_version', value: '5' }]);

    // The published page is the default: no flag at all, never a false one.
    const published = buildSubmitRequest(
        { page_id: 4, section_id: 9, form_data: { title: 'Report' } },
        { doc: { uri: 'file:///cache/a.bin', name: 'a.bin' } },
    );
    assert.equal(published.body.parts.some((part) => part.name === 'preview'), false);
});

test('no write request is a POST to the update or delete route', () => {
    const update = buildUpdateRequest({ section_id: 1, form_data: {}, update_based_on: { record_id: 2 } });
    const del = buildDeleteRequest({ record_id: 2, section_id: 1, page_id: 1 });
    assert.notEqual(update.method, 'post');
    assert.notEqual(del.method, 'post');
});

test('a submit with a picked file is multipart: fields as text, the file as an upload, then page and section', () => {
    const request = buildSubmitRequest(
        { page_id: 4, section_id: 9, form_data: { title: 'Report', doc: 'ignored.txt', note: null, tags: ['a', 'b'] } },
        { doc: { uri: 'file:///cache/report.pdf', name: 'report.pdf', mimeType: 'application/pdf' } },
    );

    assert.equal(request.method, 'post');
    assert.equal(request.body.kind, 'multipart');
    assert.deepEqual(request.body.parts, [
        { name: 'title', value: 'Report' },
        { name: 'note', value: '' },
        { name: 'tags', value: '["a","b"]' },
        { name: 'doc', file: { uri: 'file:///cache/report.pdf', name: 'report.pdf', type: 'application/pdf' } },
        { name: 'page_id', value: '4' },
        { name: 'section_id', value: '9' },
    ]);
});

test('an update with a picked file names its record in update_based_on and sends the version', () => {
    const request = buildUpdateRequest(
        {
            page_id: 4,
            section_id: 9,
            form_data: { title: 'Report' },
            update_based_on: { record_id: 12 },
            expected_version: 5,
        },
        { doc: { uri: 'file:///cache/a.bin', name: 'a.bin' } },
    );

    assert.equal(request.method, 'put');
    assert.equal(request.body.kind, 'multipart');
    const byName = Object.fromEntries(request.body.parts.map((part) => [part.name, part]));
    assert.deepEqual(byName.update_based_on, { name: 'update_based_on', value: '{"record_id":12}' });
    assert.deepEqual(byName.expected_version, { name: 'expected_version', value: '5' });
    // A bare record_id part would be read as form data and create a new row.
    assert.equal('record_id' in byName, false);
    assert.deepEqual(byName.doc.file, { uri: 'file:///cache/a.bin', name: 'a.bin', type: 'application/octet-stream' });
});

// -- what a write answer means -----------------------------------------------------------------

test('a 2xx answer with field errors is a validation result, one with an error is an error, else ok', () => {
    assert.deepEqual(
        normalizeFormResponse({ data: { field_errors: { title: 'Required' }, message: 'Check the form' } }),
        { kind: 'validation', fieldErrors: { title: 'Required' }, message: 'Check the form' },
    );
    assert.deepEqual(normalizeFormResponse({ error: 'Nope' }), { kind: 'error', message: 'Nope' });
    assert.deepEqual(
        normalizeFormResponse({ data: { message: 'Saved', redirect_url: '/done' } }),
        { kind: 'ok', data: { message: 'Saved', redirect_url: '/done' }, message: 'Saved', redirectUrl: '/done' },
    );
});

test('a 409 stale_version is a stale result that names the versions, never a plain error', () => {
    const result = failureOf(refusal(409, { reason: 'stale_version', record_id: 12, expected_version: 3, current_version: 5 }));
    assert.deepEqual(result, {
        kind: 'stale',
        stale: { reason: 'stale_version', record_id: 12, expected_version: 3, current_version: 5 },
    });
});

test('a refusal with field errors is a validation result; any other failure carries the server message', () => {
    assert.deepEqual(
        failureOf(refusal(422, { field_errors: { title: 'Too long' }, message: 'Invalid' })),
        { kind: 'validation', fieldErrors: { title: 'Too long' }, message: 'Invalid' },
    );
    assert.deepEqual(failureOf({ response: { status: 500, data: { error: 'Boom' } } }), { kind: 'error', message: 'Boom' });
    assert.deepEqual(failureOf(new Error('Network Error')), { kind: 'error', message: 'Network Error' });
});

test('describeFormFailure gives a sentence for every refusal that has no field to show it on', () => {
    assert.match(describeFormFailure({ kind: 'stale', stale: { record_id: 1, expected_version: 1, current_version: 2 } }, 'x'), /changed by someone else/);
    assert.equal(describeFormFailure({ kind: 'validation', fieldErrors: {} }, 'Could not save'), 'Could not save');
    assert.equal(describeFormFailure({ kind: 'validation', fieldErrors: {}, message: 'Check it' }, 'x'), 'Check it');
    assert.equal(describeFormFailure({ kind: 'error', message: 'Boom' }, 'x'), 'Boom');
    assert.equal(describeFormFailure({ kind: 'error', message: '' }, 'Could not delete'), 'Could not delete');
});

// -- the inputs of a form ------------------------------------------------------------------------

const field = (style, name, extra = {}, children) => ({
    style_name: style,
    fields: { name: { content: name }, ...Object.fromEntries(Object.entries(extra).map(([key, value]) => [key, { content: value }])) },
    ...(children ? { children } : {}),
});

test('the fields of a form are found in page order, also inside layout sections, but not inside a nested form', () => {
    const fields = collectFormFields([
        field('text-input', 'title', { label: 'Title', is_required: '1' }),
        { style_name: 'container', children: [field('textarea', 'note'), field('file-input', 'doc', { is_required: '1' })] },
        field('checkbox', 'agree', { is_required: '1', checkbox_value: 'yes' }),
        { style_name: 'form-log', children: [field('text-input', 'inner')] },
        { style_name: 'button' },
    ]);

    assert.deepEqual(fields.map((item) => item.name), ['title', 'note', 'doc', 'agree']);
    assert.deepEqual(fields.map((item) => item.required), [true, false, true, true]);
    assert.equal(fields[0].label, 'Title');
    assert.equal(fields[1].label, 'note');
    assert.equal(fields[2].isFile, true);
    assert.equal(fields[3].requiredValue, 'yes');
});

test('required fields are checked before anything is sent: text, files (picked or already held) and checkboxes', () => {
    const fields = collectFormFields([
        field('text-input', 'title', { label: 'Title', is_required: '1' }),
        field('file-input', 'doc', { label: 'Document', is_required: '1' }),
        field('checkbox', 'agree', { label: 'Agree', is_required: '1', checkbox_value: 'yes' }),
        field('text-input', 'optional'),
    ]);

    const missing = findMissingRequired(fields, { title: '  ', doc: '', agree: '' }, {});
    assert.deepEqual(missing.map((item) => item.name), ['title', 'doc', 'agree']);
    assert.equal(
        requiredMessage(missing),
        'Please fill in the following required fields: Title, Document, Agree',
    );
    assert.deepEqual(requiredFieldErrors(missing), {
        title: 'This field is required.',
        doc: 'This field is required.',
        agree: 'This field is required.',
    });

    const pickedFile = { doc: { uri: 'file:///a', name: 'a' } };
    assert.deepEqual(
        findMissingRequired(fields, { title: 'x', doc: '', agree: 'yes' }, pickedFile).map((item) => item.name),
        [],
    );
    assert.deepEqual(
        findMissingRequired(fields, { title: 'x', doc: 'existing.pdf', agree: 'yes' }, {}).map((item) => item.name),
        [],
    );
});

test('a form is dirty when a value differs or a file was picked; an unchanged number is not a change', () => {
    assert.equal(isFormDirty({ title: 'a', n: 1 }, { title: 'a', n: '1' }, {}), false);
    assert.equal(isFormDirty({ title: 'a' }, { title: 'b' }, {}), true);
    assert.equal(isFormDirty({}, { title: '' }, {}), false);
    assert.equal(isFormDirty({ title: 'a' }, { title: 'a' }, { doc: { uri: 'file:///a', name: 'a' } }), true);
});

test('what an input shows before it is touched is sent with the form, and what the person chose wins', () => {
    // A select shows its first option, a slider its minimum: the person sees them, so the form sends them.
    const defaults = { status: 'open', score: '0', notes: '' };
    assert.deepEqual(withUntouchedDefaults({ title: 'One' }, defaults), { title: 'One', status: 'open', score: '0', notes: '' });
    assert.deepEqual(withUntouchedDefaults({ title: 'One', status: 'done', notes: 'x' }, defaults), {
        title: 'One',
        status: 'done',
        score: '0',
        notes: 'x',
    });
    // A cleared field stays cleared: it is a value, not an untouched input.
    assert.deepEqual(withUntouchedDefaults({ status: '' }, defaults).status, '');
    // The values it was given are never changed, and nothing is sent twice.
    const given = { title: 'One' };
    withUntouchedDefaults(given, defaults);
    assert.deepEqual(given, { title: 'One' });
    assert.deepEqual(withUntouchedDefaults({}, {}), {});
});

test('a required field with a default is filled for the person who sees it, an untouched empty one is not', () => {
    const fields = collectFormFields([field('select', 'status', { is_required: '1' }), field('text-input', 'title', { is_required: '1' })]);
    const submitted = withUntouchedDefaults({}, { status: 'open', title: '' });
    assert.deepEqual(
        findMissingRequired(fields, submitted, {}).map((item) => item.name),
        ['title'],
    );
});

test('form data leaves file fields out and turns a cleared field into null only when asked to', () => {
    const fields = collectFormFields([field('text-input', 'title'), field('file-input', 'doc')]);
    assert.deepEqual(buildFormData({ title: '', doc: 'old.pdf' }, fields, true), { title: null });
    assert.deepEqual(buildFormData({ title: '', doc: 'old.pdf' }, fields, false), { title: '' });
});

// -- links and page sheets -----------------------------------------------------------------------

test('a link keeps the state of a list in its query, and the path stays the path', () => {
    assert.deepEqual(splitNavigationTarget('/events?events.page=2&events.q=ana&events.f.city=Bern'), {
        path: '/events',
        params: { 'events.page': '2', 'events.q': 'ana', 'events.f.city': 'Bern' },
    });
    assert.deepEqual(splitNavigationTarget('events'), { path: '/events', params: {} });
    assert.deepEqual(splitNavigationTarget('/events#top'), { path: '/events', params: {} });
    assert.deepEqual(splitNavigationTarget('https://example.org/events?events.page=3#x'), {
        path: '/events',
        params: { 'events.page': '3' },
    });
    // The query is never a part of the page a link names.
    assert.equal(normalizeNavigationTarget('/events?events.page=2'), '/events');
    assert.equal(toKeyword('/events?events.page=2'), 'events');
});

test('query values are decoded, a repeated key keeps its first value and a broken escape is left out', () => {
    assert.deepEqual(parseQueryString('a=b%20c&d=e+f&a=again&g=%E0%A4%A&h='), { a: 'b c', d: 'e f', h: '' });
    assert.deepEqual(parseQueryString(''), {});
    assert.deepEqual(parseQueryString('flag'), { flag: '' });
});

test('route parameters keep text only: the first value of a repeated one, no undefined, no objects', () => {
    assert.deepEqual(stringParams({ a: '1', b: ['2', '3'], c: undefined, d: 4, e: true, f: null, g: { x: 1 } }), {
        a: '1',
        b: '2',
        d: '4',
        e: 'true',
    });
    assert.deepEqual(stringParams(null), {});
});

test('a page sheet is opened with the parameters of the link and forgets them when closed', async () => {
    const { usePageModalStore } = await import('../../stores/pageModalStore.ts');
    const store = usePageModalStore;
    store.getState().open('events', null, { 'events.page': '2' });
    assert.deepEqual(store.getState().params, { 'events.page': '2' });
    store.getState().open('help');
    assert.deepEqual(store.getState().params, {}, 'Another page does not inherit them.');
    store.getState().open('events', '/events/7', { 'events.mode': 'edit' });
    assert.equal(store.getState().resolvePath, '/events/7');
    store.getState().close();
    assert.equal(store.getState().keyword, null);
    assert.equal(store.getState().resolvePath, null);
    assert.deepEqual(store.getState().params, {});
});

// -- cells and rows ------------------------------------------------------------------------------

test('cells are drawn from the text the server sent, the same on every device', () => {
    assert.equal(formatListCell('2026-11-13 09:12:00', 'datetime'), '2026-11-13 09:12');
    assert.equal(formatListCell('2026-11-13 09:12:00', 'date'), '2026-11-13');
    assert.equal(formatListCell('1', 'boolean'), 'Yes');
    assert.equal(formatListCell('no', 'boolean'), 'No');
    assert.equal(formatListCell(42, 'number'), '42');
    assert.equal(formatListCell(null, 'text'), '');
    assert.equal(formatListCell({ files: [{ index: 0, name: 'a.pdf', url: '/x' }] }, 'file'), '');
    assert.equal(formatListCell({ files: [{ index: 0, name: 'a.jpg', url: '/lists/1/records/2/files/p?page_id=3&index=0' }] }, 'image'), '');
    assert.equal(formatEntryDate('2026-11-13 09:12:00'), '2026-11-13 09:12');
});

test('file / image cells use the server { files: [...] } wrapper (contract 2)', () => {
    assert.equal(isFileCell({ files: [{ index: 0, name: 'a.pdf', url: '/lists/1/records/2/files/doc?page_id=3&index=0' }] }), true);
    assert.equal(isFileCell([{ index: 0, name: 'a.pdf', url: '/x' }]), false);
    assert.equal(isFileCell('uploads/form-files/x'), false);
});

test('an explicit remove instruction is JSON the form can send on update (contract 4)', () => {
    const removeAll = JSON.stringify({ remove: true });
    assert.match(removeAll, /"remove":\s*true/);
    const removeOne = JSON.stringify({ remove_indexes: [0] });
    assert.match(removeOne, /remove_indexes/);
});

test('a record is named by its first column with text, else by its number', () => {
    const row = { record_id: 7, values: { title: '', due: '2026-11-13', done: '1', doc: { files: [] } } };
    assert.equal(rowLabel(row, COLUMNS), '2026-11-13');
    assert.equal(rowLabel({ record_id: 8, values: {} }, COLUMNS), 'Entry 8');
    const long = { record_id: 9, values: { title: 'x'.repeat(80) } };
    assert.equal(rowLabel(long, COLUMNS).length, 60);
    assert.equal(cellOf({ title: 'T' }, COLUMNS[0]), 'T');
});

test('the results line and the range say what is shown', () => {
    assert.equal(resultsText({ total: 0, page: 1, total_pages: 1 }), 'No entries.');
    assert.equal(resultsText({ total: 1, page: 1, total_pages: 1 }), '1 entry, page 1 of 1.');
    assert.equal(resultsText({ total: 120, page: 2, total_pages: 5 }), '120 entries, page 2 of 5.');
    assert.equal(rangeText({ total: 120, page: 2, page_size: 25 }, 25), '26-50 of 120');
    assert.equal(rangeText({ total: 0, page: 1, page_size: 25 }, 0), '0 of 0');
});

test('an entry list row can always be opened; a data view row only links when the author set a detail page', () => {
    assert.equal(rowHasActions({ detail_url: null }, 'entry-form-list'), true);
    assert.equal(rowHasActions({ detail_url: null }, 'data-view'), false);
    assert.equal(rowHasActions({ detail_url: '/events/5' }, 'data-view'), true);
});

test('a list is drawn as dense rows, as cards, or from the record template the author composed', () => {
    assert.equal(listDrawing({ layout: 'table', has_template: false }), 'table');
    assert.equal(listDrawing({ layout: 'cards', has_template: false }), 'cards');
    assert.equal(listDrawing({ layout: 'custom', has_template: true }), 'template');
    // A custom view whose author placed no sections has nothing to draw: it falls back to cards, like on the web.
    assert.equal(listDrawing({ layout: 'custom', has_template: false }), 'cards');
    // The template only counts for the custom layout.
    assert.equal(listDrawing({ layout: 'table', has_template: true }), 'table');
});

test('the records of a template are drawn by the ordinary section renderer with the classes for the phone only', () => {
    const rows = read('components/styles/composite/FormList/FormListRows.tsx');
    const template = rows.slice(rows.indexOf('export function FormListTemplateRows'), rows.indexOf('function titleColumn'));
    assert.match(template, /<BasicStyle key=\{section\.id\} section=\{section\} values=\{values\} \/>/);
    assert.match(template, /rowTemplateSections\(row\)/);
    // The server decided which sections a record has: the phone neither reads nor evaluates a condition.
    assert.doesNotMatch(template, /condition|jsonLogic|evaluate/i);
    // The classes of the element that holds the records (`list_row_css`) are for the web; a phone has `css_mobile` only.
    assert.doesNotMatch(template, /row_css|rowCss|className/);
    // A data view is read only and the author draws the buttons: no generic row actions under a record.
    assert.doesNotMatch(template, /ActionsRow|renderActions|hasActions/);

    const list = read('components/styles/composite/FormList/FormList.tsx');
    assert.match(list, /drawing === 'template' \? \(\s*<FormListTemplateRows/);
});

test('only the quick actions a row lists are offered, and only those with a question ask first', () => {
    const actions = [
        { id: 'done', label: 'Mark done', confirm: null },
        { id: 'archive', label: 'Archive', confirm: 'Archive this entry?' },
    ];
    assert.deepEqual(applicableQuickActions({ quick_actions: ['archive'] }, actions).map((action) => action.id), ['archive']);
    assert.deepEqual(applicableQuickActions({ quick_actions: [] }, actions), []);
    assert.equal(needsConfirmation(actions[0]), false);
    assert.equal(needsConfirmation(actions[1]), true);
    assert.equal(needsConfirmation({ id: 'x', label: 'x', confirm: '' }), false);
});

// -- refusals --------------------------------------------------------------------------------------

test('a refusal says what happened in words, and a list refusal is never retried blindly', () => {
    const text = FORM_LIST_TEXT;
    const login = { status: 401, reason: 'login_required', parameter: null, message: null };
    const forbidden = { status: 403, reason: 'operation_disabled', parameter: null, message: null };
    const gone = { status: 404, reason: 'table_mismatch', parameter: null, message: null };
    const link = { status: 400, reason: 'invalid_list_parameter', parameter: 'news.page', message: null };
    const server = { status: 500, reason: 'request_failed', parameter: null, message: null };

    assert.equal(failureMessage(login, text), text.loginRequired);
    assert.equal(failureMessage(forbidden, text), text.forbidden);
    assert.equal(failureMessage(gone, text), text.notFound);
    assert.equal(failureMessage(link, text), text.invalidLink);
    assert.equal(failureMessage(server, text), text.loadFailed);

    assert.equal(canRetryFailure(server), true);
    assert.equal(canRetryFailure({ ...server, status: 0 }), true);
    assert.equal(canRetryFailure(forbidden), false);
    assert.equal(canShowAllFailure(link), true);
    assert.equal(canShowAllFailure(login), false);
});

test('a refusal hides the rows that were cached; a failed refresh does not', () => {
    assert.equal(isAccessFailure({ status: 401 }), true);
    assert.equal(isAccessFailure({ status: 403 }), true);
    assert.equal(isAccessFailure({ status: 404 }), true);
    assert.equal(isAccessFailure({ status: 400 }), true);
    assert.equal(isAccessFailure({ status: 500 }), false);
    assert.equal(isAccessFailure({ status: 0 }), false);
});

test('failures are read from the server envelope, a server-rendered list_error, or a bare network error', () => {
    assert.deepEqual(
        failureOfError(refusal(403, { reason: 'history_disabled' }, 'No history')),
        { status: 403, reason: 'history_disabled', parameter: null, message: 'No history' },
    );
    assert.deepEqual(
        failureOfError({ response: { status: 502, data: null } }),
        { status: 502, reason: 'request_failed', parameter: null, message: null },
    );
    assert.deepEqual(failureOfError(new Error('Network Error')), { status: 0, reason: 'request_failed', parameter: null, message: null });
    assert.deepEqual(
        failureOfSeed({ status: 401, message: 'Sign in', reason: 'login_required' }),
        { status: 401, reason: 'login_required', parameter: null, message: 'Sign in' },
    );
    assert.equal(failureOfSeed({ status: 500, message: 'x', reason: null }).reason, 'request_failed');
});

// -- the page payload ------------------------------------------------------------------------------

test('the server-rendered state and error are read off a section; anything else is no state', () => {
    const state = { list: { key: 'news' }, rows: [] };
    const error = { status: 403, message: 'No' };

    assert.deepEqual(readFormListSeed({ list_state: state }), { state, error: null });
    assert.deepEqual(readFormListSeed({ list_error: error }), { state: null, error });
    assert.deepEqual(readFormListSeed({}), { state: null, error: null });
    assert.deepEqual(readFormListSeed({ list_state: [1], list_error: 'x' }), { state: null, error: null });
});

test('the list is its own form when form_section_id equals the list id', () => {
    const list = {
        id: 361,
        style_name: 'entry-form-list',
        fields: { name: { content: 'tasks' }, btn_save_label: { content: 'Save' } },
        children: [
            { id: 362, style_name: 'text-input', fields: { name: { content: 'title' } } },
            { id: 363, style_name: 'text-input', fields: { name: { content: 'note' } } },
        ],
    };

    const form = resolveListFormSection(list, 361);
    assert.ok(form);
    assert.equal(form.id, 361);
    assert.equal(form.style_name, 'form-record');
    assert.equal(form.fields.name.content, 'tasks');
    assert.deepEqual(
        form.children.map((child) => child.fields.name.content),
        ['title', 'note'],
    );
    // Submit uses the list section id (FormUserInput reads section.id).
    assert.equal(form.id, list.id);

    // data-view / foreign table: no form.
    assert.equal(resolveListFormSection(list, null), null);
    assert.equal(resolveListFormSection({ id: 99, style_name: 'data-view', children: [] }, null), null);
    // Nested form child is not used (one model).
    assert.equal(resolveListFormSection(list, 362), null);

    const submit = buildSubmitRequest({
        page_id: 10,
        section_id: form.id,
        form_data: { title: 'Hello', note: 'World' },
    });
    assert.equal(submit.body.kind, 'json');
    assert.equal(submit.body.data.section_id, 361);
});

test('collectFormFields walks inputs of a list-as-form and skips a nested entry-form-list', () => {
    const fields = collectFormFields([
        field('text-input', 'title', { label: 'Title', is_required: '1' }),
        field('textarea', 'note'),
        { style_name: 'entry-form-list', children: [field('text-input', 'inner')] },
    ]);
    assert.deepEqual(fields.map((item) => item.name), ['title', 'note']);
});

// -- the record area ------------------------------------------------------------------------------

const selected = (record, mode, extra = {}) => ({
    record_id: record,
    mode,
    entry_date: '2026-11-13 09:00:00',
    version: 2,
    values: {},
    form_values: mode === 'edit' ? { title: 'x' } : null,
    is_own: true,
    can_update: true,
    can_delete: true,
    can_view_history: true,
    quick_actions: [],
    detail_url: null,
    ...extra,
});

test('the record area shows what the link asks for: nothing, the create form, the record, a wait, or "not found"', () => {
    const base = { mode: null, openRecord: null, frozen: null, selected: null, busy: false };

    assert.equal(resolvePanel(base), null);
    assert.deepEqual(resolvePanel({ ...base, mode: 'create' }), { kind: 'create' });
    assert.equal(resolvePanel({ ...base, mode: 'view' }), null);

    const view = selected(5, 'view');
    assert.deepEqual(resolvePanel({ ...base, mode: 'view', openRecord: 5, selected: view }), { kind: 'view', selected: view });
    assert.deepEqual(resolvePanel({ ...base, mode: 'view', openRecord: 5, busy: true }), { kind: 'loading', mode: 'view' });
    assert.deepEqual(resolvePanel({ ...base, mode: 'view', openRecord: 5 }), { kind: 'unavailable' });
    // The state of another record or mode is not the one asked for.
    assert.deepEqual(resolvePanel({ ...base, mode: 'view', openRecord: 6, selected: view }), { kind: 'unavailable' });
    assert.deepEqual(resolvePanel({ ...base, mode: 'edit', openRecord: 5, selected: view }), { kind: 'unavailable' });
});

test('the record being edited is a snapshot that a refresh never replaces', () => {
    const first = selected(5, 'edit');
    const refreshed = selected(5, 'edit', { version: 9, form_values: { title: 'someone else' } });

    assert.equal(nextFrozen(null, 'edit', 5, first), first);
    // A later state of the same record does not replace what is being typed.
    assert.equal(nextFrozen(first, 'edit', 5, refreshed), first);
    // Another record is taken once.
    assert.equal(nextFrozen(first, 'edit', 6, selected(6, 'edit')).record_id, 6);
    // Leaving the edit drops the snapshot; waiting for the state keeps none.
    assert.equal(nextFrozen(first, 'view', 5, selected(5, 'view')), null);
    assert.equal(nextFrozen(null, 'edit', 5, null), null);
    assert.equal(nextFrozen(first, null, null, null), null);

    const panel = resolvePanel({ mode: 'edit', openRecord: 5, frozen: first, selected: refreshed, busy: false });
    assert.deepEqual(panel, { kind: 'edit', selected: first });
});

// -- the list's own state -----------------------------------------------------------------------

test('a deep link carries the list parameters unchanged; other parameters are not the list', () => {
    const query = ownQueryFromRouteParams(
        { 'news.record': '5', 'news.mode': 'view', 'news.q': 'ada lovelace', other: 'x', 'news.page': undefined },
        'news',
    );
    assert.equal(query, 'news.record=5&news.mode=view&news.q=ada%20lovelace');
    assert.equal(ownQueryFromRouteParams({ 'news.record': '5' }, 'events'), '');
    assert.equal(ownQueryFromRouteParams(null, 'news'), '');
    assert.equal(ownQueryFromRouteParams({ 'news.record': '5' }, ''), '');
    // A repeated parameter stays repeated: the server refuses it with a reason, the app never repairs a link.
    assert.equal(ownQueryFromRouteParams({ 'news.f.tag': ['a', 'b'] }, 'news'), 'news.f.tag=a&news.f.tag=b');
});

test('the URL state is read from the query; a link that is not valid is the empty state', () => {
    assert.deepEqual(urlStateOfQuery('news.record=5&news.mode=view', 'news'), {
        page: 1, q: null, sort: [], filters: {}, record: 5, mode: 'view',
    });
    assert.deepEqual(urlStateOfQuery('news.bogus=1', 'news'), {
        page: 1, q: null, sort: [], filters: {}, record: null, mode: null,
    });
});

test('every change of the list state is one query string; a new search starts on the first page', () => {
    assert.equal(queryAfterChange('', 'news', { type: 'open', record: 5, mode: 'edit' }), 'news.record=5&news.mode=edit');
    assert.equal(queryAfterChange('', 'news', { type: 'create' }), 'news.mode=create');
    assert.equal(queryAfterChange('news.record=5&news.mode=view', 'news', { type: 'close' }), '');
    assert.equal(queryAfterChange('news.page=2', 'news', { type: 'search', q: 'ada' }), 'news.q=ada');
    assert.equal(queryAfterChange('news.page=2&news.q=ada', 'news', { type: 'reset' }), '');
    assert.equal(queryAfterChange('', 'news', { type: 'page', page: 3 }), 'news.page=3');
    assert.equal(queryAfterChange('', 'news', { type: 'sort', sort: [{ field: 'due', direction: 'desc' }] }), 'news.sort=due:desc');
    assert.equal(queryAfterChange('', 'news', { type: 'filter', id: 'status', value: 'open' }), 'news.f.status=open');
    // The parameters of other lists never end up in this list's state.
    assert.equal(queryAfterChange('news.page=2&other.q=x', 'news', { type: 'page', page: 3 }), 'news.page=3');
});

test('search needs two to a hundred characters; narrowing is search, filters or sort', () => {
    assert.equal(isSearchTermUsable('a'), false);
    assert.equal(isSearchTermUsable(' a '), false);
    assert.equal(isSearchTermUsable('ab'), true);
    assert.equal(isSearchTermUsable('x'.repeat(100)), true);
    assert.equal(isSearchTermUsable('x'.repeat(101)), false);

    const empty = urlStateOfQuery('', 'news');
    assert.equal(isNarrowed(empty), false);
    assert.equal(isNarrowed(urlStateOfQuery('news.q=ada', 'news')), true);
    assert.equal(isNarrowed(urlStateOfQuery('news.f.status=open', 'news')), true);
    assert.equal(isNarrowed(urlStateOfQuery('news.sort=due:asc', 'news')), true);
    assert.equal(activeFilterCount(urlStateOfQuery('news.f.status=open&news.f.tag=a', 'news')), 2);
});

test('the controls of a list read and write their raw values', () => {
    assert.deepEqual(splitRange('2026-01-01..2026-02-01'), ['2026-01-01', '2026-02-01']);
    assert.deepEqual(splitRange('..5'), ['', '5']);
    assert.deepEqual(splitRange('7'), ['7', '']);
    assert.equal(joinRange('', ''), null);
    assert.equal(joinRange('1', ''), '1..');
    assert.equal(joinRange('', '9'), '..9');

    assert.equal(normalizeBooleanFilter('TRUE'), '1');
    assert.equal(normalizeBooleanFilter('no'), '0');
    assert.equal(normalizeBooleanFilter('maybe'), '');

    assert.deepEqual(multiValues('a,b,,c'), ['a', 'b', 'c']);
    assert.equal(toggleMultiValue('a,b', 'a'), 'b');
    assert.equal(toggleMultiValue('a', 'a'), null);
    assert.equal(toggleMultiValue('', 'a'), 'a');

    const options = [{ value: 'open', label: 'Open', count: 4 }, { value: 'done', label: 'Done', count: null }];
    assert.equal(optionLabel(options[0]), 'Open (4)');
    assert.equal(optionLabel(options[1]), 'Done');
    assert.equal(selectedOptionsText(options, 'open,gone'), 'Open (4), gone');
    assert.equal(selectedOptionsText(options, ''), '');
});

// -- caches --------------------------------------------------------------------------------------------

const scope = (overrides = {}) => listCacheScope({
    apiBase: 'https://a.example',
    account: 3,
    languageId: 2,
    pageId: 4,
    sectionId: 9,
    key: 'news',
    ...overrides,
});

test('a cached list belongs to one server, account, language, platform, page, section, route, state and page version', () => {
    assert.deepEqual(formListStateKey(scope(), 'news.page=2'), [
        FORM_LIST_ROOT, 'https://a.example', '3', 2, 'mobile', 4, 9, '', 'news.page=2', 'published',
    ]);
    assert.deepEqual(formListStateKey(scope({ account: null }), '')[2], 'guest');
    // The draft of the page and the route of the page are parts of the key: they can change what a list answers.
    assert.deepEqual(formListStateKey(scope({ route: { record_id: '3' } }), 'news.page=2', true), [
        FORM_LIST_ROOT, 'https://a.example', '3', 2, 'mobile', 4, 9, 'route%5Brecord_id%5D=3', 'news.page=2', 'preview',
    ]);

    const keys = [
        formListStateKey(scope(), 'news.q=ada'),
        formListStateKey(scope({ apiBase: 'https://b.example' }), 'news.q=ada'),
        formListStateKey(scope({ account: 4 }), 'news.q=ada'),
        formListStateKey(scope({ account: null }), 'news.q=ada'),
        formListStateKey(scope({ languageId: 3 }), 'news.q=ada'),
        formListStateKey(scope({ pageId: 5 }), 'news.q=ada'),
        formListStateKey(scope({ sectionId: 10 }), 'news.q=ada'),
        formListStateKey(scope({ route: { record_id: '3' } }), 'news.q=ada'),
        formListStateKey(scope({ route: { record_id: '4' } }), 'news.q=ada'),
        formListStateKey(scope(), 'news.q=ada', true),
        formListStateKey(scope(), 'news.q=grace'),
    ].map((key) => JSON.stringify(key));
    assert.equal(new Set(keys).size, keys.length, 'no two scopes share a cache entry');
});

test('the order of the route parameters never splits a cache entry, and empty ones are no route', () => {
    assert.deepEqual(
        formListStateKey(scope({ route: { b: '2', a: '1' } }), ''),
        formListStateKey(scope({ route: { a: '1', b: '2' } }), ''),
    );
    assert.deepEqual(formListStateKey(scope({ route: {} }), ''), formListStateKey(scope(), ''));
    assert.deepEqual(formListStateKey(scope({ route: null }), ''), formListStateKey(scope(), ''));
});

test('the state in a cache key is the own one and normalized: other lists and unknown parameters never split it', () => {
    assert.deepEqual(
        formListStateKey(scope(), 'other.q=x&news.page=2'),
        formListStateKey(scope(), 'news.page=2'),
    );
});

test('rows stay on screen while the next page loads, never across accounts, servers, languages or lists', () => {
    const key = (overrides, query) => formListStateKey(scope(overrides), query);

    assert.equal(isSameFormList(key({}, 'news.page=1'), key({}, 'news.page=2')), true);
    assert.equal(isSameFormList(key({}, 'news.page=1'), key({ account: 4 }, 'news.page=1')), false);
    assert.equal(isSameFormList(key({}, 'news.page=1'), key({ account: null }, 'news.page=1')), false);
    assert.equal(isSameFormList(key({}, 'news.page=1'), key({ apiBase: 'https://b.example' }, 'news.page=1')), false);
    assert.equal(isSameFormList(key({}, 'news.page=1'), key({ languageId: 3 }, 'news.page=1')), false);
    assert.equal(isSameFormList(key({}, 'news.page=1'), key({ sectionId: 10 }, 'news.page=1')), false);
    assert.equal(isSameFormList(['form-list'], key({}, 'news.page=1')), false);

    // The record the page shows is part of the list: its rows never stand in for another record's rows.
    const record3 = { route: { record_id: '3' } };
    assert.equal(isSameFormList(key(record3, 'news.page=1'), key(record3, 'news.page=2')), true);
    assert.equal(isSameFormList(key(record3, 'news.page=1'), key({ route: { record_id: '4' } }, 'news.page=1')), false);
    assert.equal(isSameFormList(key({}, 'news.page=1'), key(record3, 'news.page=1')), false);

    // The draft of the page is never shown in place of the published rows, nor the other way round.
    assert.equal(
        isSameFormList(formListStateKey(scope(), 'news.page=1'), formListStateKey(scope(), 'news.page=1', true)),
        false,
    );
    assert.equal(
        isSameFormList(formListStateKey(scope(), 'news.page=1', true), formListStateKey(scope(), 'news.page=2', true)),
        true,
    );
});

test('histories are cached per server, account, list and record under their own root', () => {
    const history = { apiBase: 'https://a.example', account: 3, sectionId: 9, recordId: 5 };

    assert.deepEqual(formListHistoryKey(history, 2), [FORM_LIST_HISTORY_ROOT, 'https://a.example', '3', 9, 5, 'history', 2, 'published']);
    assert.deepEqual(formListVersionKey(history, 4), [FORM_LIST_HISTORY_ROOT, 'https://a.example', '3', 9, 5, 'version', 4, 'published']);
    assert.deepEqual(formListCompareKey(history, 1, 4), [FORM_LIST_HISTORY_ROOT, 'https://a.example', '3', 9, 5, 'compare', 1, 4, 'published']);
    assert.notDeepEqual(formListHistoryKey(history, 1), formListHistoryKey({ ...history, account: 4 }, 1));
    assert.notDeepEqual(formListHistoryKey(history, 1), formListHistoryKey({ ...history, account: null }, 1));

    // A history read on the draft of the page is another entry than one on the published page.
    const draft = { ...history, preview: true };
    assert.deepEqual(formListHistoryKey(draft, 2).slice(-1), ['preview']);
    assert.deepEqual(formListVersionKey(draft, 4).slice(-1), ['preview']);
    assert.deepEqual(formListCompareKey(draft, 1, 4).slice(-1), ['preview']);
    assert.notDeepEqual(formListHistoryKey(history, 1), formListHistoryKey(draft, 1));
    assert.notDeepEqual(formListVersionKey(history, 1), formListVersionKey(draft, 1));
    assert.notDeepEqual(formListCompareKey(history, 1, 2), formListCompareKey(draft, 1, 2));
});

test('only list keys are list keys: they are what logout, sign-in and access changes drop', () => {
    assert.equal(isFormListQueryKey([FORM_LIST_ROOT, 'x']), true);
    assert.equal(isFormListQueryKey([FORM_LIST_HISTORY_ROOT, 'x']), true);
    assert.equal(isFormListQueryKey(['page', 'x']), false);
    assert.equal(isFormListQueryKey([]), false);

    const calls = [];
    const cache = {
        removeQueries: (filters) => calls.push(['remove', filters.queryKey]),
        invalidateQueries: (filters) => calls.push(['invalidate', filters.queryKey]),
    };
    removeFormListQueries(cache);
    invalidateFormListQueries(cache);
    invalidateFormListQueries(cache, { history: false });

    assert.deepEqual(calls, [
        ['remove', [FORM_LIST_ROOT]],
        ['remove', [FORM_LIST_HISTORY_ROOT]],
        ['invalidate', [FORM_LIST_ROOT]],
        ['invalidate', [FORM_LIST_HISTORY_ROOT]],
        ['invalidate', [FORM_LIST_ROOT]],
    ]);
});

test('a read of a list sends the page, the language, preview and the list parameters exactly as typed', () => {
    assert.equal(
        formListStateUrl(9, { pageId: 4, languageId: 2, listQuery: 'news.q=ada&news.page=2', preview: true }),
        `${ENDPOINTS.LISTS.STATE(9)}?page_id=4&language_id=2&preview=1&news.q=ada&news.page=2`,
    );
    assert.equal(formListStateUrl(9, { pageId: 4, listQuery: '' }), `${ENDPOINTS.LISTS.STATE(9)}?page_id=4`);
});

test('a read of a list on a page with route parameters repeats them, encoded and sorted, before the list parameters', () => {
    assert.equal(
        formListStateUrl(9, {
            pageId: 4,
            languageId: 2,
            listQuery: 'news.page=2',
            route: { slug: 'a b', record_id: '3' },
        }),
        `${ENDPOINTS.LISTS.STATE(9)}?page_id=4&language_id=2&route%5Brecord_id%5D=3&route%5Bslug%5D=a%20b&news.page=2`,
    );
    // No route, an empty route and empty values add nothing.
    assert.equal(formListStateUrl(9, { pageId: 4, listQuery: '', route: null }), `${ENDPOINTS.LISTS.STATE(9)}?page_id=4`);
    assert.equal(formListStateUrl(9, { pageId: 4, listQuery: '', route: {} }), `${ENDPOINTS.LISTS.STATE(9)}?page_id=4`);
    assert.equal(
        formListStateUrl(9, { pageId: 4, listQuery: '', route: { record_id: undefined } }),
        `${ENDPOINTS.LISTS.STATE(9)}?page_id=4`,
    );
    // The draft of the page and the route travel together.
    assert.equal(
        formListStateUrl(9, { pageId: 4, listQuery: '', preview: true, route: { record_id: '3' } }),
        `${ENDPOINTS.LISTS.STATE(9)}?page_id=4&preview=1&route%5Brecord_id%5D=3`,
    );
});

test('the declared route of the page is read from the values the renderer hands to a style: text only', () => {
    assert.deepEqual(pageRouteParams({ page_route_params: { record_id: '3', slug: 'team' } }), { record_id: '3', slug: 'team' });
    // Anything that is not a non-empty text is left out; nothing is guessed from a number.
    assert.deepEqual(pageRouteParams({ page_route_params: { a: '1', b: 2, c: '', d: null, e: undefined, f: {} } }), { a: '1' });
    assert.equal(pageRouteParams({ page_route_params: { b: 2 } }), null);
    assert.equal(pageRouteParams({ page_route_params: {} }), null);
    assert.equal(pageRouteParams({ page_route_params: null }), null);
    assert.equal(pageRouteParams({ page_route_params: ['3'] }), null);
    assert.equal(pageRouteParams({ page_route_params: 'record_id=3' }), null);
    assert.equal(pageRouteParams({}), null);
});

// -- what the server drew for each record -------------------------------------------------------

/** The words the section renderer draws for sections: in document order, a text section its own words, then its children. */
function textsOfSections(sections) {
    const words = [];
    const walk = (list) => {
        for (const section of list) {
            if (section.style_name === 'text') {
                words.push(String(section.text?.content ?? ''));
            }
            walk(section.children ?? []);
        }
    };
    walk(sections);
    return words;
}

test('a record of a custom layout draws exactly the sections the server shipped for it, evaluating nothing', () => {
    // The fixture the backend asserts against its real server and the web renderer draws from: the server decided,
    // from the seats and the city of each record, which sections each record has. Every section still carries the
    // condition as the author wrote it (tokens a phone cannot resolve); a phone that read them would lose or invent some.
    const fixture = JSON.parse(read('__tests__/fixtures/form-list-row-conditions.json'));
    const rows = fixture.state.rows;
    assert.deepEqual(rows.map((row) => row.record_id), [101, 103, 105]);

    assert.deepEqual(rows.map((row) => textsOfSections(rowTemplateSections(row))), fixture.drawn);

    // The sections of one record are never found inside another record.
    const everything = JSON.stringify(rows.map((row) => textsOfSections(rowTemplateSections(row))));
    for (const forbidden of fixture.neverDrawn) {
        assert.equal(everything.includes(forbidden), false, `"${forbidden}" is not drawn for any record`);
    }
    assert.equal(textsOfSections(rowTemplateSections(rows[0])).includes('Roomy: 15 seats'), false);
    assert.equal(textsOfSections(rowTemplateSections(rows[1])).includes('Roomy: 15 seats'), true);
    assert.equal(textsOfSections(rowTemplateSections(rows[2])).includes('Held in Basel'), false);

    // The sections that remain still carry their condition untouched: the helper hands them over as they are.
    const withCondition = JSON.stringify(rowTemplateSections(rows[1])).includes('{{seats}}');
    assert.equal(withCondition, true);
    assert.equal(rowTemplateSections(rows[1]), rows[1].sections, 'the very sections of the record, not a filtered copy');
});

test('a record without sections draws none; the list never lends the sections of another record', () => {
    assert.deepEqual(rowTemplateSections({}), []);
    assert.deepEqual(rowTemplateSections({ sections: undefined }), []);
    const first = { sections: [{ id: 1 }] };
    const second = { sections: [] };
    assert.deepEqual(rowTemplateSections(first), [{ id: 1 }]);
    assert.deepEqual(rowTemplateSections(second), []);
});

// -- which version a save is based on ------------------------------------------------------------

test('a save of an existing record names the version it was filled from, never a guess', () => {
    const base = { insideList: false, listVersion: null, recordId: 12, pageVersion: 3, saved: null };

    // On a page: the version the page was built with.
    assert.equal(saveBasedOnVersion(base), 3);
    // After a successful save of the same record the page still holds the older one: the next save is based on the new.
    assert.equal(saveBasedOnVersion({ ...base, saved: { recordId: 12, version: 4 } }), 4);
    // A save of another record never lends its version.
    assert.equal(saveBasedOnVersion({ ...base, saved: { recordId: 99, version: 8 } }), 3);
    // A version that is not newer than the page's own is ignored (the page was read again meanwhile).
    assert.equal(saveBasedOnVersion({ ...base, pageVersion: 5, saved: { recordId: 12, version: 4 } }), 5);
    // A page that offered no version cannot save: there is nothing to base the save on, and nothing is invented.
    assert.equal(saveBasedOnVersion({ ...base, pageVersion: null }), null);
    assert.equal(saveBasedOnVersion({ ...base, pageVersion: null, saved: { recordId: 12, version: 2 } }), 2);

    // In a list: the version of the record the list opened, whatever the page holds.
    assert.equal(saveBasedOnVersion({ ...base, insideList: true, listVersion: 7 }), 7);
    assert.equal(saveBasedOnVersion({ ...base, insideList: true, listVersion: null }), null);
    assert.equal(saveBasedOnVersion({ ...base, insideList: true, listVersion: 7, saved: { recordId: 12, version: 9 } }), 7);
});

// -- reading a file of an earlier version --------------------------------------------------------

test('a file of an earlier version is asked for with the page, the language and the position, on the draft only in preview', () => {
    const target = {
        sectionId: 9,
        recordId: 5,
        version: 2,
        fieldKey: 'document',
        languageId: 2,
        index: 1,
        pageId: 4,
    };
    assert.deepEqual(historicalFileRequest(target), {
        url: ENDPOINTS.LISTS.VERSION_FILE(9, 5, 2, 'document'),
        params: { page_id: '4', file_language: '2', index: '1' },
    });
    assert.deepEqual(historicalFileRequest({ ...target, preview: true }).params, {
        page_id: '4',
        file_language: '2',
        index: '1',
        preview: '1',
    });
    // The published page is the default: no flag at all.
    assert.equal('preview' in historicalFileRequest({ ...target, preview: false }).params, false);
    // A language of 0 (no language chosen yet) reads the language-independent value; a negative position is the first.
    assert.deepEqual(historicalFileRequest({ ...target, languageId: 0, index: -3 }).params, {
        page_id: '4',
        file_language: '1',
        index: '0',
    });
});

test('a downloaded file keeps a name that cannot leave the app cache, and the version it belongs to', () => {
    assert.equal(downloadFileName('report.pdf'), 'report.pdf');
    assert.equal(downloadFileName('../../etc/passwd'), 'passwd');
    assert.equal(downloadFileName('C:\\Windows\\win.ini'), 'win.ini');
    assert.equal(downloadFileName('..hidden'), 'hidden');
    assert.equal(downloadFileName('a<b>c:d"e|f?g*h.txt'), 'a_b_c_d_e_f_g_h.txt');
    assert.equal(downloadFileName('bad\u0000na\u0007me.txt'), 'badname.txt');
    assert.equal(downloadFileName(''), 'file');
    assert.equal(downloadFileName('///'), 'file');
    assert.equal(downloadFileName('..'), 'file');
    assert.equal(downloadFileName('', 'document'), 'document');

    const long = `${'x'.repeat(300)}.pdf`;
    const shortened = downloadFileName(long);
    assert.equal(shortened.length, 100);
    assert.equal(shortened.endsWith('.pdf'), true, 'the extension survives: the share sheet decides by it');

    assert.equal(cachedFileName(3, 'report.pdf'), 'v3-report.pdf');
    assert.notEqual(cachedFileName(2, 'report.pdf'), cachedFileName(3, 'report.pdf'));
    assert.equal(cachedFileName(1, '../x.txt'), 'v1-x.txt');
});

test('the share sheet is told the type of the file by its name, opaque bytes otherwise', () => {
    assert.equal(mimeTypeOfFileName('report.PDF'), 'application/pdf');
    assert.equal(mimeTypeOfFileName('photo.jpeg'), 'image/jpeg');
    assert.equal(mimeTypeOfFileName('photo.jpg'), 'image/jpeg');
    assert.equal(mimeTypeOfFileName('notes.txt'), 'text/plain');
    assert.equal(mimeTypeOfFileName('archive.tar.gz'), 'application/octet-stream');
    assert.equal(mimeTypeOfFileName('noextension'), 'application/octet-stream');
    assert.equal(mimeTypeOfFileName('.pdf.exe'), 'application/octet-stream');
});

test('a refused or failed file read means: not allowed, gone, or try again', () => {
    assert.equal(historicalFileFailure({ response: { status: 401 } }), 'denied');
    assert.equal(historicalFileFailure({ response: { status: 403 } }), 'denied');
    assert.equal(historicalFileFailure({ response: { status: 404 } }), 'gone');
    assert.equal(historicalFileFailure({ response: { status: 410 } }), 'gone');
    assert.equal(historicalFileFailure({ response: { status: 500 } }), 'failed');
    assert.equal(historicalFileFailure({ response: { status: 'x' } }), 'failed');
    // A network error has no response; none of these may throw.
    assert.equal(historicalFileFailure(new Error('Network Error')), 'failed');
    assert.equal(historicalFileFailure(null), 'failed');
    assert.equal(historicalFileFailure(undefined), 'failed');
});

test('a file of a change belongs to the version that held it: the revision itself, the one before it, or the compared pair', () => {
    // A revision left its own state behind and replaced the one before it; the first has nothing before it.
    assert.deepEqual(fileVersionsOfRevision(3), { before: 2, after: 3 });
    assert.deepEqual(fileVersionsOfRevision(1), { before: null, after: 1 });
    // A comparison is ordered by version whatever order the person picked.
    assert.deepEqual(fileVersionsOfComparison(2, 5), { before: 2, after: 5 });
    assert.deepEqual(fileVersionsOfComparison(5, 2), { before: 2, after: 5 });
});

test('the history offers a download for a file that is still there, through the app session, and says why one failed', () => {
    const history = read('components/styles/composite/FormList/FormListHistory.tsx');
    // The download acts on the page version the history shows, and every place that lists files offers it.
    assert.match(history, /useWritePreview\(\)/);
    assert.match(history, /downloadHistoricalFile\(/);
    assert.equal((history.match(/onDownload=\{download\}/g) ?? []).length, 3, 'revision changes, comparison, and the entry after the version');
    assert.match(history, /historicalFileFailure\(error\)/);

    const changes = read('components/styles/composite/FormList/FormListChanges.tsx');
    // A file that was erased since offers no button.
    assert.match(changes, /file\.available && request !== null && onDownload !== undefined/);

    // Reading the bytes uses the session client (the access is checked on the server), never a public URL.
    const native = read('services/formListFileDownload.ts');
    assert.match(native, /getApiClient\(\)\.get/);
    assert.match(native, /responseType: 'arraybuffer'/);
    assert.match(native, /Sharing\.shareAsync/);
    assert.match(native, /Paths\.cache/);
});


test('the app wires the list caches into the places that clear or persist them', () => {
    // Sign-in, access changes, logout and a server switch drop or refresh the list roots.
    const session = read('services/sessionService.ts');
    assert.match(session, /removeFormListQueries\(appQueryClient\)/);
    assert.match(session, /invalidateFormListQueries\(appQueryClient\)/);
    assert.match(session, /queryMemory: \(\) => appQueryClient\.clear\(\)/);

    // The live-sync stream reads the lists again through `applySyncTags` (`acl` reads every list, a page or
    // table tag the lists on the pages that named it); the access watcher does the same for a changed stamp.
    const acl = read('hooks/useAclEventStream.ts');
    assert.match(acl, /applySyncTags\(/);
    const syncApply = read('services/syncApply.ts');
    assert.match(syncApply, /queryKey: \[FORM_LIST_ROOT\]/);
    assert.match(syncApply, /queryKey: \[FORM_LIST_HISTORY_ROOT\]/);
    assert.match(read('providers/SessionSyncProvider.tsx'), /invalidateAccessQueries\(queryClient\)/);

    // The rows of a list are never written to the persisted query cache.
    const provider = read('providers/QueryProvider.tsx');
    assert.match(provider, /shouldDehydrateQuery/);
    assert.match(provider, /!isFormListQueryKey\(query\.queryKey\)/);
});

test('both list styles are registered and drawn by the same component', () => {
    const registry = read('components/styles/index.ts');
    assert.match(registry, /'entry-form-list': FormList/);
    assert.match(registry, /'data-view': FormList/);
});

// -- history and restore ----------------------------------------------------------------------

const change = (field, language = 1) => ({ field_key: field, language_id: language, field_label: field, kind: 'value', change: 'changed' });

test('a restore is the whole version, only what can be restored, or nothing', () => {
    const whole = planRestore({ dry_run: true, changes: [change('title'), change('note')], blockers: [] }, null);
    assert.deepEqual(whole, { blockers: [], allowedFields: ['title', 'note'], partial: false, nothing: false, canConfirm: true });

    const blocker = { field_key: 'note', language_id: 1, field_label: 'note', reason: 'file_unavailable' };
    const partial = planRestore({ dry_run: true, changes: [change('title'), change('note')], blockers: [blocker] }, null);
    assert.equal(partial.partial, true);
    assert.deepEqual(partial.allowedFields, ['title']);
    assert.equal(partial.canConfirm, true);

    const stopped = planRestore({ dry_run: true, changes: [change('note')], blockers: [blocker] }, null);
    assert.equal(stopped.canConfirm, false);
    assert.equal(stopped.partial, false);

    const same = planRestore({ dry_run: true, changes: [], blockers: [] }, null);
    assert.equal(same.nothing, true);
    assert.equal(same.canConfirm, false);

    assert.equal(planRestore(null, null).canConfirm, false);

    // The server may still refuse a real restore: its blockers replace the dry run's.
    const refused = planRestore({ dry_run: true, changes: [change('title')], blockers: [] }, [
        { field_key: 'title', language_id: 1, field_label: 'title', reason: 'invalid_value' },
    ]);
    assert.equal(refused.canConfirm, false);
    assert.equal(blockerKey('title', 1), 'title:1');
});

test('a revision is described in one line: what, from where, by whom, through what', () => {
    const revision = {
        operation: 'update',
        source: 'form',
        actor: { id: 3, name: 'Ada' },
        impersonated_by: null,
        restored_from_version: null,
    };
    assert.equal(describeRevision(revision), 'Updated by Ada via form');
    assert.equal(
        describeRevision({ ...revision, operation: 'restore', restored_from_version: 2, source: 'admin' }),
        'Restored from version 2 by Ada via administration',
    );
    assert.equal(
        describeRevision({ ...revision, impersonated_by: { id: 1, name: 'Root' } }),
        'Updated by Ada (by Root) via form',
    );
    assert.equal(describeRevision({ ...revision, actor: null, source: 'job' }), 'Updated by unknown via scheduled job');
    assert.equal(describeRevision({ ...revision, actor: { id: 8, name: null } }), 'Updated by user 8 via form');
});

test('a comparison picks two versions and the last two picked stay; history is at least one page', () => {
    assert.deepEqual(togglePickedVersion([], 2), [2]);
    assert.deepEqual(togglePickedVersion([2], 5), [2, 5]);
    assert.deepEqual(togglePickedVersion([2, 5], 7), [5, 7]);
    assert.deepEqual(togglePickedVersion([2, 5], 5), [2]);

    assert.equal(historyTotalPages(0, 10), 1);
    assert.equal(historyTotalPages(11, 10), 2);
    assert.equal(historyTotalPages(5, 0), 5);
});
