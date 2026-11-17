/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Pure logic of the form lists (`entry-form-list` / `data-view`) on mobile.
 *
 * The server decides, the app draws: rows, columns, controls, capabilities and
 * per-row permissions come from the list state. Everything in here only
 * reshapes what the server sent (labels, cell text, which panel to show, the
 * URL state a deep link asks for, what a restore would do) and is free of
 * React Native so `node --test` covers it (`__tests__/unit/formList.test.mjs`).
 * The URL grammar and the cache keys come from `@selfhelp/shared`, the same
 * code the web renderer runs.
 */
import {
    FORM_LIST_SEARCH_MAX_LENGTH,
    FORM_LIST_SEARCH_MIN_LENGTH,
    applyFormListUrlChange,
    emptyFormListUrlState,
    formListQueryString,
    getFormListFailure,
    isFormListParam,
    parseFormListQuery,
    type IFormListCacheScope,
    type IFormListColumn,
    type IFormListError,
    type IFormListFailure,
    type IFormListInfo,
    type IFormListQuickActionInfo,
    type IFormListRestoreBlocker,
    type IFormListRestorePreview,
    type IFormListRow,
    type IFormListSelected,
    type IFormListState,
    type IFormListUrlState,
    type TFormListCellValue,
    type TFormListMode,
    type TFormListUrlChange,
} from '@selfhelp/shared';

/**
 * The words a list draws around the author's content. Author text (the add
 * button, the empty text, the search placeholder, the delete question) comes
 * from the server in the visitor's language (`list.labels`); these are the
 * fallbacks and the fixed chrome. The app translates them with
 * `t('formList.<key>', <default>)`.
 */
export const FORM_LIST_TEXT = {
    add: 'Add entry',
    empty: 'No entries yet.',
    emptyFiltered: 'No entries match your search or filters.',
    search: 'Search',
    searchShort: 'Type at least 2 characters to search.',
    clearSearch: 'Clear search',
    resetFilters: 'Reset search and filters',
    filters: 'Filters',
    anyValue: 'Any',
    yes: 'Yes',
    no: 'No',
    from: 'from',
    to: 'to',
    confirmDelete: 'Delete this entry? This cannot be undone.',
    loading: 'Loading entries',
    loadFailed: 'The list could not be loaded.',
    refreshFailed: 'The list could not be refreshed. The entries shown may be out of date.',
    updating: 'Updating',
    refresh: 'Refresh',
    retry: 'Try again',
    backToList: 'Back to the list',
    view: 'View',
    edit: 'Edit',
    delete: 'Delete',
    history: 'History',
    details: 'Details',
    cancel: 'Cancel',
    close: 'Close',
    done: 'Done',
    entry: 'Entry',
    editTitle: 'Edit entry',
    saved: 'Entry saved.',
    created: 'Entry created.',
    deleted: 'Entry deleted.',
    actionDone: 'Done.',
    restored: 'Version restored.',
    discardTitle: 'Discard your changes?',
    discardBody: 'You have changes that are not saved. If you leave now they are lost.',
    discardConfirm: 'Discard changes',
    keepEditing: 'Keep editing',
    notFound: 'This entry no longer exists or you may not open it.',
    noForm: 'This list has no form to create or edit entries.',
    notConfigured: 'This list is not configured yet.',
    cannotEdit: 'You may not edit this entry.',
    conflictTitle: 'Someone else changed this entry',
    conflictBody: 'Your changes were not saved, and what you typed is still in the form.',
    conflictReview: 'Review what changed',
    conflictKeep: 'Keep my changes and save over theirs',
    conflictReload: 'Load the latest version',
    conflictKeepHint: 'Your changes will replace the newer version when you save.',
    conflictDeleteBody: 'This entry was changed by someone else, so it was not changed. Reload the list to see the latest version.',
    conflictReloadList: 'Reload the list',
    loginRequired: 'Sign in to see your entries.',
    forbidden: 'You may not use this list.',
    invalidLink: 'This link does not describe a valid list state.',
    showAll: 'Show the whole list',
    sortBy: 'Sort by',
    previous: 'Previous',
    next: 'Next',
    historyEmpty: 'No earlier versions are available.',
    historyCurrent: 'Current version',
    historyCompare: 'Compare selected',
    historyCompareCurrent: 'Compare with current',
    historyRestore: 'Restore this version',
    historyRestorePreview: 'What a restore would change',
    historyRestoreConfirm: 'Restore',
    historyRestoreOnlyPossible: 'Restore only what can be restored',
    historyBlockedTitle: 'Some fields cannot be restored',
    historyNothingToRestore: 'The entry already matches this version.',
    historyChecks: 'Select two versions to compare',
    historyAvailableNo: 'file no longer available',
    historyDownload: 'Download',
    historyDownloadFailed: 'This file could not be downloaded. Try again.',
    historyDownloadDenied: 'You may not download this file.',
    historyDownloadGone: 'This file is no longer available.',
    historyDownloadSaved: 'The file is in the app storage; this phone has no way to open it from here.',
    historyDenied: 'The history of this entry is not available to you.',
    nothingChanged: 'Nothing changed.',
    emptyCell: 'Empty',
} as const;

export type TFormListTextKey = keyof typeof FORM_LIST_TEXT;
export type TFormListText = { readonly [K in TFormListTextKey]: string };

/** How long the search and text filters wait after the last keystroke before the list reads again. */
export const FORM_LIST_INPUT_DEBOUNCE_MS = 350;

/** What the record area of a list shows for the current state of the list. */
export type TFormListPanel =
    | { kind: 'loading'; mode: TFormListMode }
    | { kind: 'create' }
    | { kind: 'edit'; selected: IFormListSelected }
    | { kind: 'view'; selected: IFormListSelected }
    | { kind: 'unavailable' };

export type TFormListOpenTab = 'details' | 'history';

// -- text ---------------------------------------------------------------------------

/** Whether a search term can be sent: 2 to 100 characters after trimming (the server refuses anything else). */
export function isSearchTermUsable(term: string): boolean {
    const trimmed = term.trim();
    return trimmed.length >= FORM_LIST_SEARCH_MIN_LENGTH && trimmed.length <= FORM_LIST_SEARCH_MAX_LENGTH;
}

/** True for the cell value of a file / image column (`{ files: [...] }`). */
export function isFileCell(value: TFormListCellValue | undefined): value is Extract<TFormListCellValue, { files: unknown }> {
    return !!value && typeof value === 'object' && !Array.isArray(value) && Array.isArray((value as { files?: unknown }).files);
}

const TRUE_WORDS = new Set(['1', 'true', 'yes', 'on']);
const DATE_ONLY = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2})(?::\d{2})?)?/;

/**
 * A cell as plain text, for rows and accessible names. Deterministic (no
 * `Intl`, no time zone): a date the server sent as `2026-11-13 09:12:00` is
 * drawn from that text alone, so the web and the app show the same thing.
 */
export function formatListCell(value: TFormListCellValue | undefined, format: IFormListColumn['format']): string {
    if (value === null || value === undefined || isFileCell(value)) {
        return '';
    }
    const text = String(value);
    if (text === '') {
        return '';
    }
    switch (format) {
        case 'boolean':
            return TRUE_WORDS.has(text.trim().toLowerCase()) ? 'Yes' : 'No';
        case 'date': {
            const match = DATE_ONLY.exec(text);
            return match ? match[1] : text;
        }
        case 'datetime': {
            const match = DATE_ONLY.exec(text);
            return match ? (match[2] ? `${match[1]} ${match[2]}` : match[1]) : text;
        }
        default:
            return text;
    }
}

/** `entry_date` of a row as the date and time it is drawn with. */
export function formatEntryDate(entryDate: string): string {
    return formatListCell(entryDate, 'datetime');
}

/** The cell of a row for a column (the server keys `values` by the column's `field`). */
export function cellOf(values: Record<string, TFormListCellValue>, column: IFormListColumn): TFormListCellValue | undefined {
    return values[column.field];
}

/**
 * A short name for a record, for buttons and dialogs ("Edit Write report"):
 * the first column that has text, cut to 60 characters, else `Entry <id>`.
 */
export function rowLabel(
    row: { record_id: number; values: Record<string, TFormListCellValue> },
    columns: readonly IFormListColumn[],
): string {
    for (const column of columns) {
        const text = formatListCell(cellOf(row.values, column), column.format).trim();
        if (text !== '') {
            return text.length > 60 ? `${text.slice(0, 57)}...` : text;
        }
    }
    return `Entry ${row.record_id}`;
}

/** The results line: "12 entries, page 1 of 2." */
export function resultsText(pagination: { total: number; page: number; total_pages: number }): string {
    if (pagination.total === 0) {
        return 'No entries.';
    }
    return `${pagination.total} ${pagination.total === 1 ? 'entry' : 'entries'}, page ${pagination.page} of ${pagination.total_pages}.`;
}

/** The visible range: "26-50 of 120". */
export function rangeText(pagination: { total: number; page: number; page_size: number }, shown: number): string {
    if (pagination.total === 0 || shown === 0) {
        return `0 of ${pagination.total}`;
    }
    const from = (pagination.page - 1) * pagination.page_size + 1;
    return `${from}-${from + shown - 1} of ${pagination.total}`;
}

// -- rows ---------------------------------------------------------------------------

export type TFormListKind = 'entry-form-list' | 'data-view';

/** How the rows of a list are drawn: dense rows, cards, or the sections the author composed for one record. */
export type TFormListDrawing = 'table' | 'cards' | 'template';

/**
 * The drawing a list state asks for. `custom` draws the record template the server drew once per record
 * (`row.sections`); a `custom` view whose author placed no sections has none and falls back to cards,
 * the same as on the web.
 */
export function listDrawing(list: Pick<IFormListInfo, 'layout' | 'has_template'>): TFormListDrawing {
    if (list.layout === 'custom') {
        return list.has_template ? 'template' : 'cards';
    }

    return list.layout === 'cards' ? 'cards' : 'table';
}

/**
 * True when a row has anything to offer. A record of an entry list can always
 * be opened; a data view row only links to its detail page when the author set
 * one.
 */
export function rowHasActions(row: IFormListRow, kind: TFormListKind): boolean {
    return kind === 'entry-form-list' || row.detail_url !== null;
}

/** The quick actions that apply to a row now: the list labels them, the row says which ones hold. Offer no other. */
export function applicableQuickActions(
    row: Pick<IFormListRow, 'quick_actions'>,
    actions: readonly IFormListQuickActionInfo[],
): IFormListQuickActionInfo[] {
    return actions.filter((action) => row.quick_actions.includes(action.id));
}

/** True when a quick action asks for a confirmation first. */
export function needsConfirmation(action: IFormListQuickActionInfo): boolean {
    return action.confirm !== null && action.confirm !== '';
}

// -- failures -----------------------------------------------------------------------

/** The reason shown when the server (or the network) gave none. */
export const FORM_LIST_UNKNOWN_FAILURE_REASON = 'request_failed';

/** What a server-rendered `list_error` says, as the failure the error state draws. */
export function failureOfSeed(error: IFormListError): IFormListFailure {
    return {
        status: error.status,
        reason: typeof error.reason === 'string' && error.reason !== '' ? error.reason : FORM_LIST_UNKNOWN_FAILURE_REASON,
        parameter: error.parameter ?? null,
        message: error.message,
    };
}

/** What a failed request says; a network error or a bare 500 has no reason and gets the generic one. */
export function failureOfError(error: unknown): IFormListFailure {
    const known = getFormListFailure(error);
    if (known !== null) {
        return known;
    }
    const status = (error as { response?: { status?: unknown } } | null | undefined)?.response?.status;
    return {
        status: typeof status === 'number' ? status : 0,
        reason: FORM_LIST_UNKNOWN_FAILURE_REASON,
        parameter: null,
        message: null,
    };
}

/** True when the failure means the visitor may not (or no longer may) see this list: its cached rows must not stay on screen. */
export function isAccessFailure(failure: IFormListFailure): boolean {
    return failure.status === 400 || failure.status === 401 || failure.status === 403 || failure.status === 404;
}

/** What to tell the visitor for a refusal; the reason is the server's stable code. */
export function failureMessage(failure: IFormListFailure, text: TFormListText): string {
    if (failure.status === 401 || failure.reason === 'login_required') {
        return text.loginRequired;
    }
    if (failure.status === 403) {
        return text.forbidden;
    }
    if (failure.status === 404) {
        return text.notFound;
    }
    if (failure.status === 400) {
        return text.invalidLink;
    }
    return text.loadFailed;
}

/** A failed read can be tried again (network error, server error); a refusal cannot. */
export function canRetryFailure(failure: IFormListFailure): boolean {
    return failure.status === 0 || failure.status >= 500;
}

/** A refusal caused by the link or the configuration offers the whole list instead. */
export function canShowAllFailure(failure: IFormListFailure): boolean {
    return failure.status === 400 || failure.status === 403 || failure.status === 404;
}

// -- the state the list shows --------------------------------------------------------

interface IFormListSeedSource {
    list_state?: unknown;
    list_error?: unknown;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The server-rendered state (or error) the page payload carries for a list section. */
export interface IFormListSeed {
    state: IFormListState | null;
    error: IFormListError | null;
}

/** Read `list_state` / `list_error` off a section of the page payload. */
export function readFormListSeed(section: object): IFormListSeed {
    const source = section as IFormListSeedSource;
    return {
        state: isObject(source.list_state) ? (source.list_state as unknown as IFormListState) : null,
        error: isObject(source.list_error) ? (source.list_error as unknown as IFormListError) : null,
    };
}

interface IListFormSection {
    id?: unknown;
    style_name?: unknown;
    children?: unknown;
}

/**
 * The form of a list. When `form_section_id` is the list's own section id, the
 * list **is** the form: return a `form-record` view of that section (same id,
 * fields and input children) so `FormUserInput` submits with
 * `section_id = <list id>`. `null` for a data view, a foreign `data_table`
 * (read-only override) or any other mismatch — nested form children are not
 * used (one model).
 */
export function resolveListFormSection<T extends IListFormSection>(
    listSection: T,
    formSectionId: number | null,
): T | null {
    if (formSectionId === null) {
        return null;
    }
    if (listSection.id !== formSectionId) {
        return null;
    }
    return {
        ...listSection,
        style_name: 'form-record',
    };
}

interface IPanelInput {
    mode: TFormListMode | null;
    openRecord: number | null;
    /** The record being edited, frozen when it was opened. */
    frozen: IFormListSelected | null;
    selected: IFormListSelected | null;
    /** A read is loading or in flight, so the record may still arrive. */
    busy: boolean;
}

/**
 * What the record area shows. The record being edited is a snapshot: a
 * background refresh or somebody else's change never replaces what the person
 * is typing; it is renewed only on purpose ("load the latest version").
 */
export function resolvePanel(input: IPanelInput): TFormListPanel | null {
    const { mode, openRecord, frozen, selected, busy } = input;
    if (mode === null) {
        return null;
    }
    if (mode === 'create') {
        return { kind: 'create' };
    }
    if (openRecord === null) {
        return null;
    }
    const selectedMatches = selected !== null && selected.record_id === openRecord && selected.mode === mode;
    if (mode === 'edit' && frozen !== null && frozen.record_id === openRecord) {
        return { kind: 'edit', selected: frozen };
    }
    if (mode === 'view' && selectedMatches && selected !== null) {
        return { kind: 'view', selected };
    }
    if (busy) {
        return { kind: 'loading', mode };
    }
    return { kind: 'unavailable' };
}

/**
 * The record to freeze when an edit opens: the server's `selected` for exactly
 * the record and mode the person asked for, taken once.
 */
export function nextFrozen(
    current: IFormListSelected | null,
    mode: TFormListMode | null,
    openRecord: number | null,
    selected: IFormListSelected | null,
): IFormListSelected | null {
    if (mode === 'edit' && openRecord !== null) {
        const matches = selected !== null && selected.record_id === openRecord && selected.mode === mode;
        if (matches && (current === null || current.record_id !== openRecord)) {
            return selected;
        }
        return current !== null && current.record_id === openRecord ? current : null;
    }
    return null;
}

// -- the list's own URL state --------------------------------------------------------

type TRouteParamValue = string | readonly string[] | undefined;

/**
 * The raw `<key>.*` query string a deep link carries for a list. The router
 * hands over decoded parameters; they are encoded again exactly as typed, so
 * an unknown, repeated or malformed parameter stays in and the server refuses
 * it with a reason (a client never repairs a link silently).
 */
export function ownQueryFromRouteParams(params: Readonly<Record<string, TRouteParamValue>> | null | undefined, key: string): string {
    if (key === '' || !params) {
        return '';
    }
    const pairs: string[] = [];
    for (const [name, value] of Object.entries(params)) {
        if (!isFormListParam(name, key) || value === undefined) {
            continue;
        }
        const values = typeof value === 'string' ? [value] : value;
        for (const item of values) {
            pairs.push(`${encodeURIComponent(name)}=${encodeURIComponent(item)}`);
        }
    }
    return pairs.join('&');
}

/** The URL state a raw query string asks for; the empty state when it is not a valid one (the server then answers with the reason). */
export function urlStateOfQuery(query: string, key: string): IFormListUrlState {
    const parsed = parseFormListQuery(query, key);
    return parsed.ok ? parsed.state : emptyFormListUrlState();
}

/** The raw query string after a change of the list state made by the visitor. */
export function queryAfterChange(query: string, key: string, change: TFormListUrlChange): string {
    return formListQueryString('', key, applyFormListUrlChange(urlStateOfQuery(query, key), change));
}

/** True when a state narrows the list (search, filters or sort). */
export function isNarrowed(state: IFormListUrlState): boolean {
    return state.q !== null || Object.keys(state.filters).length > 0 || state.sort.length > 0;
}

/** True when search or filters (not the sort) narrow the list. */
export function isFiltered(state: IFormListUrlState): boolean {
    return state.q !== null || Object.keys(state.filters).length > 0;
}

/** The cache scope of one list on mobile. */
export function listCacheScope(input: {
    apiBase: string;
    account: string | number | null;
    languageId: number;
    pageId: number;
    sectionId: number;
    key: string;
    /** The declared route parameters of the page; another route is another state (a record template can read it). */
    route?: Readonly<Record<string, string | undefined>> | null;
}): IFormListCacheScope {
    return { ...input, platform: 'mobile' };
}

/**
 * The declared route parameters of the page a list is on, as `PageRenderer` hands them to every style
 * (`values.page_route_params`, from `page.route_params`). Only text values count: the server checks them
 * against the routes of the page, the app only repeats what its page was built with. `null` for a page without
 * route parameters (or when nothing usable was handed down).
 */
export function pageRouteParams(values: Readonly<Record<string, unknown>>): Readonly<Record<string, string>> | null {
    const given = values.page_route_params;
    if (given === null || typeof given !== 'object' || Array.isArray(given)) {
        return null;
    }
    const route: Record<string, string> = {};
    for (const [name, value] of Object.entries(given)) {
        if (typeof value === 'string' && value !== '') {
            route[name] = value;
        }
    }

    return Object.keys(route).length > 0 ? route : null;
}

/**
 * The sections the server drew for ONE record of a `custom` layout, exactly as it sent them. Every record
 * carries its own: which sections a record has (its conditions on its own values and on the page's route) was
 * decided on the server, so the phone neither filters them, nor reads their conditions, nor lends one record's
 * sections to another.
 */
export function rowTemplateSections(row: Pick<IFormListRow, 'sections'>): NonNullable<IFormListRow['sections']> {
    return row.sections ?? [];
}

// -- filter controls -----------------------------------------------------------------

/** `from..to`, either side may be empty. */
export function splitRange(value: string): [string, string] {
    const at = value.indexOf('..');
    if (at === -1) {
        return [value, ''];
    }
    return [value.slice(0, at), value.slice(at + 2)];
}

/** The raw value of a range control: null when both sides are empty. */
export function joinRange(from: string, to: string): string | null {
    return from === '' && to === '' ? null : `${from}..${to}`;
}

/** A boolean control's raw value as the choice it shows: `1`, `0` or `''` (any). */
export function normalizeBooleanFilter(value: string): '1' | '0' | '' {
    const lower = value.toLowerCase();
    if (['1', 'true', 'yes'].includes(lower)) {
        return '1';
    }
    if (['0', 'false', 'no'].includes(lower)) {
        return '0';
    }
    return '';
}

/** The selected values of a multi-select control. */
export function multiValues(value: string): string[] {
    return value === '' ? [] : value.split(',').filter((item) => item !== '');
}

/** The raw value after one option of a multi-select was toggled: null when nothing stays selected. */
export function toggleMultiValue(value: string, option: string): string | null {
    const current = multiValues(value);
    const next = current.includes(option) ? current.filter((item) => item !== option) : [...current, option];
    return next.length === 0 ? null : next.join(',');
}

/** An option as the picker draws it: the label, with the count when the server sent one. */
export function optionLabel(option: { label: string; count: number | null }): string {
    return option.count === null ? option.label : `${option.label} (${option.count})`;
}

/** The text a select-like control shows for its raw value (the labels of the chosen options, else the raw value). */
export function selectedOptionsText(
    options: readonly { value: string; label: string; count: number | null }[] | undefined,
    value: string,
): string {
    if (value === '') {
        return '';
    }
    const chosen = multiValues(value);
    return chosen
        .map((item) => {
            const option = (options ?? []).find((candidate) => candidate.value === item);
            return option ? optionLabel(option) : item;
        })
        .join(', ');
}

/** The number of controls with a value, shown on the filters button. */
export function activeFilterCount(state: IFormListUrlState): number {
    return Object.keys(state.filters).length;
}

// -- history and restore --------------------------------------------------------------

export const BLOCKER_WORDS: Readonly<Record<IFormListRestoreBlocker['reason'], string>> = {
    field_missing: 'the field no longer exists',
    language_missing: 'the language no longer exists',
    file_unavailable: 'the file is no longer available',
    invalid_value: 'the value is no longer valid',
};

/** The key a change or blocker is identified by (a field in one language). */
export function blockerKey(fieldKey: string, languageId: number): string {
    return `${fieldKey}:${languageId}`;
}

export interface IRestorePlan {
    blockers: IFormListRestoreBlocker[];
    /** The fields a partial restore may write (changes that no blocker stops). */
    allowedFields: string[];
    /** Some fields are blocked but others can be restored. */
    partial: boolean;
    /** The entry already matches the version: nothing to restore. */
    nothing: boolean;
    canConfirm: boolean;
}

/**
 * What the dry run of a restore allows: the whole restore, a restore of the
 * fields that can be restored, or nothing. The server stays the authority and
 * answers a real restore that cannot be applied whole with `restore_blocked`.
 */
export function planRestore(
    preview: IFormListRestorePreview | null,
    blockedByServer: readonly IFormListRestoreBlocker[] | null,
): IRestorePlan {
    const blockers = [...(blockedByServer ?? preview?.blockers ?? [])];
    const blockedKeys = new Set(blockers.map((blocker) => blockerKey(blocker.field_key, blocker.language_id)));
    const allowedFields = preview
        ? [...new Set(preview.changes
            .filter((change) => !blockedKeys.has(blockerKey(change.field_key, change.language_id)))
            .map((change) => change.field_key))]
        : [];
    const partial = blockers.length > 0 && allowedFields.length > 0;
    const nothing = preview !== null && preview.changes.length === 0 && blockers.length === 0;
    const canConfirm = preview !== null && !nothing && (blockers.length === 0 || partial);
    return { blockers, allowedFields, partial, nothing, canConfirm };
}

export const OPERATION_WORDS = {
    create: 'Created',
    update: 'Updated',
    delete: 'Deleted',
    restore: 'Restored',
    baseline: 'Earlier state',
} as const;

export const SOURCE_WORDS = {
    form: 'form',
    admin: 'administration',
    quick_action: 'quick action',
    job: 'scheduled job',
    import: 'import',
    system: 'system',
} as const;

interface IRevisionLike {
    operation: keyof typeof OPERATION_WORDS;
    source: keyof typeof SOURCE_WORDS;
    actor: { id: number; name: string | null } | null;
    impersonated_by: { id: number; name: string | null } | null;
    restored_from_version: number | null;
}

/** "Updated by Ada via form": who did what to a revision, in one line. */
export function describeRevision(revision: IRevisionLike): string {
    const actor = revision.actor?.name ?? (revision.actor ? `user ${revision.actor.id}` : 'unknown');
    const by = revision.impersonated_by
        ? `${actor} (by ${revision.impersonated_by.name ?? `user ${revision.impersonated_by.id}`})`
        : actor;
    const restored = revision.operation === 'restore' && revision.restored_from_version !== null
        ? ` from version ${revision.restored_from_version}`
        : '';
    return `${OPERATION_WORDS[revision.operation]}${restored} by ${by} via ${SOURCE_WORDS[revision.source]}`;
}

/** Toggle a version in the two-version comparison pick: the last two picked stay. */
export function togglePickedVersion(current: readonly number[], version: number): number[] {
    if (current.includes(version)) {
        return current.filter((item) => item !== version);
    }
    return [...current, version].slice(-2);
}

/** The pages of a history: at least one. */
export function historyTotalPages(total: number, pageSize: number): number {
    return Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
}
