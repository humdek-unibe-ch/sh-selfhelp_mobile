/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * The `entry-form-list` and `data-view` styles on a phone.
 *
 * A list shows the entries of one form (or the rows of a data table) the way
 * the author configured it: search, sort, filters, paging, quick actions, and
 * for an entry list the create / view / edit / delete of one record in a
 * sheet or on the page. The server decides everything that matters (which rows
 * this person may see, what each row allows, what a save may write, whether it
 * is stale); this component draws what it sent and sends the ordinary form
 * requests for writes. See `docs/reference/api/22-form-lists.md` in the
 * backend and `docs/reference/styles/forms.md`.
 *
 * No offline write queue and no local database: a list always reads the
 * server, and every cached list is dropped when the person, the server or the
 * language changes.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, BackHandler, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
    getFormListFailure,
    nextSortOnHeaderClick,
    type IFormListQuickActionInfo,
    type IFormListRow,
    type IFormListSelected,
    type IFormStaleVersionData,
} from '@selfhelp/shared';

import type { IStyleProps, TSectionLike } from '@/components/renderer/types';
import { readBooleanField, readStringField, useInterpolatedField } from '@/components/renderer/useField';
import { navigateToPage } from '@/components/shell/usePageNavigation';
import { useAppColors } from '@/hooks/useAppColors';
import { FORM_LIST_ROOT } from '@/services/formListQueryKeys';
import type { IFormListFormContext, IFormListFormSaved } from '../../forms/FormListFormContext';

import {
    isStaleError,
    useAnnouncer,
    useFormListDeleteMutation,
    useFormListQueryState,
    useFormListQuickActionMutation,
    useFormListState,
    useFormListText,
} from './FormList.hooks';
import { FormListConfirm } from './FormListConfirm';
import { FormListErrorState } from './FormListErrorState';
import { FormListRecord } from './FormListRecord';
import { FormListRowActions } from './FormListRowActions';
import { FormListCards, FormListDenseRows, FormListSortBar, FormListTemplateRows } from './FormListRows';
import { FormListSheet } from './FormListSheet';
import { FormListToolbar } from './FormListToolbar';
import { ListBanner, ListButton, ListText } from './FormListPrimitives';
import { listPalette, styles, type IListPalette } from './FormList.styles';
import type { IFormListDeleteTarget, IFormListNotice, IFormListQuickTarget } from './FormList.types';
import {
    findFormChild,
    isNarrowed,
    listDrawing,
    needsConfirmation,
    nextFrozen,
    pageRouteParams,
    rangeText,
    readFormListSeed,
    resolvePanel,
    resultsText,
    rowHasActions,
    rowLabel,
    type TFormListKind,
    type TFormListOpenTab,
    type TFormListText,
} from './FormList.logic';

/** The way a dismissible refusal is shown above the list or the record. */
function NoticeBar({ notice, onDismiss, onReload, palette, text }: {
    notice: IFormListNotice;
    onDismiss: () => void;
    onReload: () => void;
    palette: IListPalette;
    text: TFormListText;
}): React.ReactElement {
    return (
        <ListBanner tone={notice.tone === 'conflict' ? 'warning' : 'error'} palette={palette} testID="form-list-notice">
            <View style={{ gap: 8 }}>
                <ListText palette={palette}>{notice.message}</ListText>
                <View style={styles.actions}>
                    {notice.tone === 'conflict' ? (
                        <ListButton label={text.conflictReloadList} onPress={onReload} palette={palette} testID="form-list-notice-reload" />
                    ) : null}
                    <ListButton label={text.close} onPress={onDismiss} palette={palette} testID="form-list-notice-close" />
                </View>
            </View>
        </ListBanner>
    );
}

export function FormList({ section, values }: IStyleProps): React.ReactElement {
    const colors = useAppColors();
    const palette = useMemo(() => listPalette(colors), [colors]);
    const text = useFormListText();
    const queryClient = useQueryClient();
    const { announcement, announce } = useAnnouncer();

    const sectionId = Number(section.id);
    const pageId = Number(values.page_id) || 0;
    const kind: TFormListKind = String(section.style_name) === 'data-view' ? 'data-view' : 'entry-form-list';
    const isEntryList = kind === 'entry-form-list';
    const listKey = readStringField(section, 'list_key').trim();
    const heading = useInterpolatedField(section, 'title', values);
    const presentationField = readStringField(section, 'form_presentation', 'modal');
    const showHistoryField = readBooleanField(section, 'show_history', false);
    const seed = useMemo(() => readFormListSeed(section), [section]);
    // The page's own route (`/team/{record_id}`): the layout of a record can read it, so it is part of the list's state.
    const pageRoute = values.page_route_params;
    const route = useMemo(() => pageRouteParams({ page_route_params: pageRoute }), [pageRoute]);

    const { query, urlState, navigate, clear } = useFormListQueryState(listKey);
    const list = useFormListState({ pageId: listKey === '' ? 0 : pageId, sectionId, listKey, query, seed, route });
    const state = list.state;

    // -- what the link asks to show --------------------------------------------------------
    const mode = urlState.mode;
    const openRecord = urlState.record;
    const selected = state?.selected ?? null;

    // The record being edited is a snapshot: a background refresh or somebody else's change
    // must never replace what the person is typing. It is renewed only on purpose.
    const [frozen, setFrozen] = useState<IFormListSelected | null>(null);
    const frozenNext = nextFrozen(frozen, mode, openRecord, selected);
    if (frozenNext !== frozen) {
        setFrozen(frozenNext);
    }

    const panel = useMemo(
        () => resolvePanel({
            mode,
            openRecord,
            frozen,
            selected,
            busy: list.isFetching || list.isPlaceholder || list.isLoading,
        }),
        [mode, openRecord, frozen, selected, list.isFetching, list.isPlaceholder, list.isLoading],
    );
    const panelOpen = panel !== null;

    const [tab, setTab] = useState<TFormListOpenTab>('details');
    const [conflict, setConflict] = useState<IFormStaleVersionData | null>(null);
    /** After "keep my changes": the version the next save is based on. */
    const [versionOverride, setVersionOverride] = useState<number | null>(null);
    /** Bumped to rebuild the inline form from scratch ("load the latest version"). */
    const [formEpoch, setFormEpoch] = useState(0);
    const [notice, setNotice] = useState<IFormListNotice | null>(null);

    const formChild = useMemo(
        () => findFormChild(
            (section as { children?: TSectionLike[] }).children,
            state?.list.form_section_id ?? null,
        ),
        [section, state?.list.form_section_id],
    );
    const presentation = state?.list.form_presentation ?? (isEntryList && presentationField === 'page' ? 'page' : 'modal');
    const historyOffered = isEntryList && showHistoryField && Boolean(state?.capabilities.history);

    // -- leaving a form with unsaved input --------------------------------------------------
    const dirtyCheckRef = useRef<(() => boolean) | null>(null);
    const registerDirtyCheck = useCallback((check: (() => boolean) | null) => {
        dirtyCheckRef.current = check;
    }, []);
    const [discard, setDiscard] = useState<{ proceed: () => void } | null>(null);
    const leave = useCallback((proceed: () => void) => {
        if (dirtyCheckRef.current?.() === true) {
            setDiscard({ proceed });
        } else {
            proceed();
        }
    }, []);

    const invalidateLists = useCallback(
        () => queryClient.invalidateQueries({ queryKey: [FORM_LIST_ROOT] }),
        [queryClient],
    );

    const closeRecord = useCallback(() => {
        dirtyCheckRef.current = null;
        setConflict(null);
        setVersionOverride(null);
        setTab('details');
        navigate({ type: 'close' });
    }, [navigate]);

    const requestClose = useCallback(() => leave(closeRecord), [leave, closeRecord]);

    const handleSaved = useCallback((result: IFormListFormSaved) => {
        announce(result.created ? text.created : text.saved);
        void invalidateLists();
        closeRecord();
    }, [announce, text.created, text.saved, invalidateLists, closeRecord]);

    const handleStale = useCallback((stale: IFormStaleVersionData) => {
        setConflict(stale);
        AccessibilityInfo.announceForAccessibility(text.conflictTitle);
    }, [text.conflictTitle]);

    const reloadLatest = useCallback(() => {
        leave(() => {
            void invalidateLists().then(() => {
                dirtyCheckRef.current = null;
                setFrozen(null);
                setConflict(null);
                setVersionOverride(null);
                setFormEpoch((value) => value + 1);
            });
        });
    }, [leave, invalidateLists]);

    const keepDraft = useCallback(() => {
        if (conflict === null) {
            return;
        }
        setVersionOverride(conflict.current_version);
        setConflict(null);
        announce(text.conflictKeepHint);
    }, [conflict, announce, text.conflictKeepHint]);

    const editing = panel?.kind === 'edit' ? panel.selected : null;
    const panelKind = panel?.kind ?? null;
    const formContext = useMemo<IFormListFormContext | null>(() => {
        if (panelKind !== 'create' && panelKind !== 'edit') {
            return null;
        }
        return {
            recordId: editing?.record_id ?? null,
            prefill: editing?.form_values ?? null,
            expectedVersion: editing ? (versionOverride ?? editing.version) : null,
            onSaved: handleSaved,
            onStale: handleStale,
            onCancel: requestClose,
            registerDirtyCheck,
        };
    }, [panelKind, editing, versionOverride, handleSaved, handleStale, requestClose, registerDirtyCheck]);

    // -- opening records, deleting, quick actions -------------------------------------------
    const openRecordFromRow = useCallback((row: IFormListRow, openMode: 'view' | 'edit', openTab: TFormListOpenTab) => {
        setTab(openTab);
        setConflict(null);
        setVersionOverride(null);
        setNotice(null);
        navigate({ type: 'open', record: row.record_id, mode: openMode });
    }, [navigate]);

    const switchToEdit = useCallback(() => {
        if (panel?.kind === 'view') {
            navigate({ type: 'open', record: panel.selected.record_id, mode: 'edit' });
        }
    }, [panel, navigate]);

    const deleteMutation = useFormListDeleteMutation(pageId, sectionId);
    const [deleteTarget, setDeleteTarget] = useState<IFormListDeleteTarget | null>(null);
    const [deleteNotice, setDeleteNotice] = useState<'conflict' | 'error' | null>(null);

    const closeDelete = useCallback(() => {
        setDeleteTarget(null);
        setDeleteNotice(null);
    }, []);

    const confirmDelete = useCallback(() => {
        if (deleteTarget === null) {
            return;
        }
        const target = deleteTarget;
        deleteMutation.mutate(
            { recordId: target.recordId, expectedVersion: target.version },
            {
                onSuccess: () => {
                    closeDelete();
                    announce(text.deleted);
                    if (openRecord === target.recordId) {
                        closeRecord();
                    }
                },
                onError: (error) => {
                    setDeleteNotice(isStaleError(error) ? 'conflict' : 'error');
                },
            },
        );
    }, [deleteTarget, deleteMutation, closeDelete, announce, text.deleted, openRecord, closeRecord]);

    const quickMutation = useFormListQuickActionMutation(pageId, sectionId);
    const [quickTarget, setQuickTarget] = useState<IFormListQuickTarget | null>(null);

    const runQuickAction = useCallback((target: IFormListQuickTarget) => {
        quickMutation.mutate(
            { recordId: target.row.record_id, actionId: target.action.id, expectedVersion: target.row.version },
            {
                onSuccess: () => {
                    setQuickTarget(null);
                    announce(`${target.action.label}: ${text.actionDone}`);
                },
                onError: (error) => {
                    setQuickTarget(null);
                    const failure = getFormListFailure(error);
                    setNotice(isStaleError(error)
                        ? { tone: 'conflict', message: text.conflictDeleteBody }
                        : { tone: 'error', message: failure !== null && failure.status === 403 ? text.forbidden : text.loadFailed });
                },
            },
        );
    }, [quickMutation, announce, text.actionDone, text.conflictDeleteBody, text.forbidden, text.loadFailed]);

    const startQuickAction = useCallback((action: IFormListQuickActionInfo, row: IFormListRow, label: string) => {
        setNotice(null);
        const target = { action, row, label };
        if (needsConfirmation(action)) {
            setQuickTarget(target);
        } else {
            runQuickAction(target);
        }
    }, [runQuickAction]);

    // -- the Android back button closes the record shown on the page -------------------------
    // (A sheet is a native Modal: its own back handling goes through `onRequestClose`.)
    const requestCloseRef = useRef(requestClose);
    useEffect(() => {
        requestCloseRef.current = requestClose;
    }, [requestClose]);
    const pageMode = presentation === 'page' && panelOpen;
    useEffect(() => {
        if (!pageMode) {
            return undefined;
        }
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
            requestCloseRef.current();
            return true;
        });
        return () => subscription.remove();
    }, [pageMode]);

    // -- when a record closes, say where the person is again ---------------------------------
    const previouslyOpen = useRef(false);
    useEffect(() => {
        if (previouslyOpen.current && !panelOpen) {
            AccessibilityInfo.announceForAccessibility(text.backToList);
        }
        previouslyOpen.current = panelOpen;
    }, [panelOpen, text.backToList]);

    // -- drawing ------------------------------------------------------------------------------
    if (listKey === '') {
        return (
            <View style={styles.root}>
                <ListBanner tone="warning" palette={palette}>{text.notConfigured}</ListBanner>
            </View>
        );
    }

    const headingNode = heading !== '' ? (
        <Text accessibilityRole="header" style={[styles.heading, { color: palette.text }]}>{heading}</Text>
    ) : null;

    if (state === null) {
        if (list.failure !== null) {
            return (
                <View style={styles.root} testID={`form-list-${listKey}`}>
                    {headingNode}
                    {/* A list without parameters has nothing to drop: showing it whole then reads it again, so a refusal
                        that was lifted meanwhile (access granted again) does not stay on screen. */}
                    <FormListErrorState
                        failure={list.failure}
                        onRetry={list.retry}
                        onShowAll={query === '' ? list.retry : clear}
                        palette={palette}
                        text={text}
                    />
                </View>
            );
        }
        return (
            <View style={styles.root} testID={`form-list-${listKey}`}>
                {headingNode}
                <View
                    style={styles.loadingBox}
                    accessibilityRole="progressbar"
                    accessibilityLabel={text.loading}
                    testID="form-list-loading"
                >
                    <ActivityIndicator color={palette.primary} />
                </View>
            </View>
        );
    }

    const labels = state.list.labels;
    const addLabel = labels.add ?? text.add;
    const searchLabel = labels.search ?? text.search;
    const emptyLabel = labels.empty ?? text.empty;
    const deleteQuestion = labels.confirm_delete ?? text.confirmDelete;
    const canCreate = isEntryList && state.capabilities.create;
    const narrowed = isNarrowed(urlState);
    const pagination = state.pagination;
    const drawing = listDrawing(state.list);
    const hasActions = (row: IFormListRow) => rowHasActions(row, kind);
    const busy = list.isFetching;

    const openDetail = (row: IFormListRow) => {
        if (row.detail_url !== null) {
            navigateToPage(row.detail_url);
        }
    };

    const renderActions = (row: IFormListRow, label: string) => (
        <FormListRowActions
            row={row}
            label={label}
            kind={kind}
            historyOffered={historyOffered}
            quickActions={state.capabilities.quick_actions}
            palette={palette}
            text={text}
            onOpen={(openMode, openTab) => openRecordFromRow(row, openMode, openTab)}
            onDelete={() => {
                setDeleteNotice(null);
                setDeleteTarget({ recordId: row.record_id, version: row.version, label });
            }}
            onQuickAction={(action) => startQuickAction(action, row, label)}
            onOpenDetail={() => openDetail(row)}
        />
    );

    // A read-only list has nothing to open unless the author gave it a detail page: its rows are then plain
    // text, not buttons that do nothing.
    const hasDetailPage = state.rows.some((row) => row.detail_url !== null);
    const onOpenRow = isEntryList
        ? (row: IFormListRow) => openRecordFromRow(row, 'view', 'details')
        : (hasDetailPage ? (row: IFormListRow) => openDetail(row) : null);

    const recordTitle = (() => {
        if (panel === null) {
            return '';
        }
        switch (panel.kind) {
            case 'create':
                return addLabel;
            case 'edit':
                return `${text.editTitle}: ${rowLabel(panel.selected, state.columns)}`;
            case 'view':
                return rowLabel(panel.selected, state.columns);
            default:
                return text.entry;
        }
    })();

    const noticeBar = notice !== null ? (
        <NoticeBar
            notice={notice}
            onDismiss={() => setNotice(null)}
            onReload={() => { setNotice(null); void invalidateLists(); }}
            palette={palette}
            text={text}
        />
    ) : null;

    const recordBody = panel === null ? null : (
        <FormListRecord
            pageId={pageId}
            sectionId={sectionId}
            state={state}
            panel={panel}
            formChild={formChild}
            values={values}
            formContext={formContext}
            formKey={`${panel.kind}-${panel.kind === 'edit' ? panel.selected.record_id : 'new'}-${formEpoch}`}
            conflict={conflict}
            onConflictKeep={keepDraft}
            onConflictReload={reloadLatest}
            tab={tab}
            onTab={setTab}
            historyOffered={historyOffered}
            onEdit={switchToEdit}
            onDelete={() => {
                if (panel.kind === 'view') {
                    setDeleteNotice(null);
                    setDeleteTarget({
                        recordId: panel.selected.record_id,
                        version: panel.selected.version,
                        label: rowLabel(panel.selected, state.columns),
                    });
                }
            }}
            onRestored={() => {
                announce(text.restored);
                void invalidateLists();
            }}
            onBack={presentation === 'page' ? requestClose : null}
            palette={palette}
            text={text}
        />
    );

    const statusLine = announcement !== '' ? announcement : resultsText(pagination);

    return (
        <View style={styles.root} testID={`form-list-${listKey}`} accessibilityState={{ busy }}>
            {headingNode}

            {announcement !== '' ? (
                <ListBanner tone="info" palette={palette} testID="form-list-announcement">{announcement}</ListBanner>
            ) : null}

            {pageMode ? (
                <View style={styles.pagePanel} testID="form-list-record-page">
                    <Text accessibilityRole="header" style={[styles.panelTitle, { color: palette.text }]}>{recordTitle}</Text>
                    {noticeBar}
                    {recordBody}
                </View>
            ) : (
                <View style={styles.body}>
                    {noticeBar}

                    {list.refreshFailure !== null ? (
                        <ListBanner tone="warning" palette={palette} testID="form-list-refresh-failed">
                            <View style={{ gap: 8 }}>
                                <ListText palette={palette}>{text.refreshFailed}</ListText>
                                <View style={styles.actions}>
                                    <ListButton label={text.retry} onPress={list.retry} palette={palette} testID="form-list-refresh-retry" />
                                </View>
                            </View>
                        </ListBanner>
                    ) : null}

                    <FormListToolbar
                        state={state}
                        urlState={urlState}
                        onChange={navigate}
                        addLabel={addLabel}
                        searchLabel={searchLabel}
                        canCreate={canCreate}
                        onAdd={() => { setNotice(null); navigate({ type: 'create' }); }}
                        palette={palette}
                        text={text}
                    />

                    {state.rows.length === 0 ? (
                        <View style={{ gap: 8, alignItems: 'flex-start' }} testID="form-list-empty">
                            <ListText palette={palette} muted>{narrowed ? text.emptyFiltered : emptyLabel}</ListText>
                            {narrowed ? (
                                <ListButton
                                    label={text.resetFilters}
                                    onPress={() => navigate({ type: 'reset' })}
                                    palette={palette}
                                    testID="form-list-empty-reset"
                                />
                            ) : null}
                        </View>
                    ) : (
                        <>
                            {drawing === 'table' ? (
                                <FormListSortBar
                                    state={state}
                                    palette={palette}
                                    text={text}
                                    onSort={(field) => navigate({ type: 'sort', sort: nextSortOnHeaderClick(state.state.sort, field) })}
                                />
                            ) : null}
                            {drawing === 'template' ? (
                                <FormListTemplateRows
                                    state={state}
                                    text={text}
                                    busy={busy}
                                    onOpenRow={onOpenRow}
                                    values={values}
                                />
                            ) : drawing === 'cards' ? (
                                <FormListCards
                                    state={state}
                                    palette={palette}
                                    text={text}
                                    busy={busy}
                                    onOpenRow={onOpenRow}
                                    renderActions={renderActions}
                                    hasActions={hasActions}
                                />
                            ) : (
                                <FormListDenseRows
                                    state={state}
                                    palette={palette}
                                    text={text}
                                    busy={busy}
                                    onOpenRow={onOpenRow}
                                    renderActions={renderActions}
                                    hasActions={hasActions}
                                />
                            )}
                        </>
                    )}

                    <View style={styles.pager} testID="form-list-pager">
                        <Text
                            accessibilityLiveRegion="polite"
                            style={{ color: palette.textMuted, fontSize: 13 }}
                            testID="form-list-status"
                        >
                            {pagination.total_pages > 1 ? rangeText(pagination, state.rows.length) : statusLine}
                        </Text>
                        {pagination.total_pages > 1 ? (
                            <View style={styles.pager}>
                                <ListButton
                                    label={text.previous}
                                    disabled={pagination.page <= 1}
                                    onPress={() => navigate({ type: 'page', page: pagination.page - 1 })}
                                    palette={palette}
                                    testID="form-list-previous"
                                />
                                <ListText palette={palette} muted size={14}>{`${pagination.page} / ${pagination.total_pages}`}</ListText>
                                <ListButton
                                    label={text.next}
                                    disabled={pagination.page >= pagination.total_pages}
                                    onPress={() => navigate({ type: 'page', page: pagination.page + 1 })}
                                    palette={palette}
                                    testID="form-list-next"
                                />
                            </View>
                        ) : null}
                        <ListButton
                            label={text.refresh}
                            busy={busy}
                            onPress={() => { void invalidateLists(); }}
                            palette={palette}
                            testID="form-list-refresh"
                        />
                    </View>
                </View>
            )}

            {presentation === 'modal' ? (
                <FormListSheet
                    visible={panelOpen}
                    title={recordTitle}
                    closeLabel={text.close}
                    onRequestClose={requestClose}
                    palette={palette}
                >
                    {noticeBar}
                    {recordBody}
                </FormListSheet>
            ) : null}

            <FormListConfirm
                visible={deleteTarget !== null}
                title={text.delete}
                confirmLabel={text.delete}
                cancelLabel={deleteNotice === 'conflict' ? text.close : text.cancel}
                confirmTone="danger"
                busy={deleteMutation.isPending}
                hideConfirm={deleteNotice === 'conflict'}
                onConfirm={confirmDelete}
                onCancel={() => {
                    const stale = deleteNotice === 'conflict';
                    closeDelete();
                    if (stale) {
                        void invalidateLists();
                    }
                }}
                palette={palette}
                testID="form-list-delete-dialog"
                notice={deleteNotice === null ? null : (
                    <ListBanner tone={deleteNotice === 'conflict' ? 'warning' : 'error'} palette={palette}>
                        {deleteNotice === 'conflict' ? text.conflictDeleteBody : text.loadFailed}
                    </ListBanner>
                )}
            >
                <ListText palette={palette}>{deleteTarget !== null ? `${deleteTarget.label}: ${deleteQuestion}` : deleteQuestion}</ListText>
            </FormListConfirm>

            <FormListConfirm
                visible={quickTarget !== null}
                title={quickTarget?.action.label ?? ''}
                confirmLabel={quickTarget?.action.label ?? ''}
                cancelLabel={text.cancel}
                confirmTone="primary"
                busy={quickMutation.isPending}
                onConfirm={() => { if (quickTarget !== null) { runQuickAction(quickTarget); } }}
                onCancel={() => setQuickTarget(null)}
                palette={palette}
                testID="form-list-quick-dialog"
            >
                <ListText palette={palette}>{quickTarget !== null ? `${quickTarget.label}: ${quickTarget.action.confirm ?? ''}` : ''}</ListText>
            </FormListConfirm>

            <FormListConfirm
                visible={discard !== null}
                title={text.discardTitle}
                confirmLabel={text.discardConfirm}
                cancelLabel={text.keepEditing}
                confirmTone="danger"
                onConfirm={() => {
                    const pending = discard;
                    dirtyCheckRef.current = null;
                    setDiscard(null);
                    pending?.proceed();
                }}
                onCancel={() => setDiscard(null)}
                palette={palette}
                testID="form-list-discard-dialog"
            >
                <ListText palette={palette}>{text.discardBody}</ListText>
            </FormListConfirm>
        </View>
    );
}
