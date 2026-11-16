/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import type { IFormListSelected, IFormListState, IFormStaleVersionData } from '@selfhelp/shared';

import { BasicStyle } from '@/components/renderer/BasicStyle';
import type { TSectionLike } from '@/components/renderer/types';
import { FormListFormContext, type IFormListFormContext } from '../../forms/FormListFormContext';

import { useFormListCompare } from './FormList.hooks';
import { FormListCell } from './FormListCell';
import { FormListChanges } from './FormListChanges';
import { FormListHistory } from './FormListHistory';
import { ListBanner, ListButton, ListText } from './FormListPrimitives';
import { styles, type IListPalette } from './FormList.styles';
import {
    cellOf,
    formatEntryDate,
    type TFormListOpenTab,
    type TFormListPanel,
    type TFormListText,
} from './FormList.logic';

interface IFormListRecordProps {
    pageId: number;
    sectionId: number;
    state: IFormListState;
    panel: TFormListPanel;
    /** The inline form section of the list, or null when the list has none. */
    formChild: TSectionLike | null;
    /** The interpolation values of the page (the form needs `page_id`). */
    values: Record<string, unknown>;
    /** What the inline form needs (record, prefill, version, callbacks); null outside create/edit. */
    formContext: IFormListFormContext | null;
    /** Changes when the inline form must be rebuilt from scratch (another record, "load the latest version"). */
    formKey: string;
    conflict: IFormStaleVersionData | null;
    onConflictKeep: () => void;
    onConflictReload: () => void;
    tab: TFormListOpenTab;
    onTab: (tab: TFormListOpenTab) => void;
    historyOffered: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onRestored: () => void;
    /** Page presentation only: the way back to the list. */
    onBack: (() => void) | null;
    palette: IListPalette;
    text: TFormListText;
}

interface IConflictProps {
    conflict: IFormStaleVersionData;
    pageId: number;
    sectionId: number;
    onKeep: () => void;
    onReload: () => void;
    palette: IListPalette;
    text: TFormListText;
}

/**
 * A save the server refused because someone else changed the record first.
 * Nothing was written and what the person typed is still in the form below.
 * They can look at what changed, keep their input and save over the newer
 * version on purpose, or load the latest version (discarding their input).
 */
function Conflict({ conflict, pageId, sectionId, onKeep, onReload, palette, text }: IConflictProps): React.ReactElement {
    const [review, setReview] = useState(false);
    const comparison = useFormListCompare(
        { pageId, sectionId, recordId: conflict.record_id },
        review ? conflict.expected_version : null,
        review ? conflict.current_version : null,
    );

    return (
        <ListBanner tone="warning" title={text.conflictTitle} palette={palette} testID="form-list-conflict">
            <View style={{ gap: 10 }}>
                <ListText palette={palette}>{text.conflictBody}</ListText>
                <ListText palette={palette} muted size={13}>
                    {`You started from version ${conflict.expected_version}; the entry is now at version ${conflict.current_version}.`}
                </ListText>
                <View style={styles.actions}>
                    <ListButton label={text.conflictReview} onPress={() => setReview((open) => !open)} selected={review} palette={palette} testID="form-list-conflict-review" />
                    <ListButton label={text.conflictKeep} onPress={onKeep} palette={palette} testID="form-list-conflict-keep" />
                    <ListButton label={text.conflictReload} onPress={onReload} palette={palette} testID="form-list-conflict-reload" />
                </View>
                {review ? (
                    <View>
                        {comparison.isLoading ? (
                            <ActivityIndicator accessibilityLabel={text.loading} color={palette.primary} />
                        ) : null}
                        {comparison.error ? <ListText palette={palette}>{text.historyDenied}</ListText> : null}
                        {comparison.data ? <FormListChanges changes={comparison.data.changes} palette={palette} text={text} /> : null}
                    </View>
                ) : null}
            </View>
        </ListBanner>
    );
}

/** One record, read-only: each configured column as a label and its value. */
function RecordView({ state, selected, palette, text }: { state: IFormListState; selected: IFormListSelected; palette: IListPalette; text: TFormListText }): React.ReactElement {
    return (
        <View style={{ gap: 12 }} testID="form-list-record-view">
            {state.columns.map((column) => (
                <View key={column.field} style={styles.cell}>
                    <Text style={[styles.detailLabel, { color: palette.textMuted }]}>{column.label}</Text>
                    <FormListCell value={cellOf(selected.values, column)} column={column} palette={palette} text={text} />
                </View>
            ))}
            <View style={styles.cell}>
                <Text style={[styles.detailLabel, { color: palette.textMuted }]}>Entry date</Text>
                <ListText palette={palette}>{formatEntryDate(selected.entry_date)}</ListText>
            </View>
        </View>
    );
}

/**
 * The area of a list that shows one record or the create form. The caller puts
 * it in a sheet or on the page; this component only decides its content.
 */
export function FormListRecord({
    pageId,
    sectionId,
    state,
    panel,
    formChild,
    values,
    formContext,
    formKey,
    conflict,
    onConflictKeep,
    onConflictReload,
    tab,
    onTab,
    historyOffered,
    onEdit,
    onDelete,
    onRestored,
    onBack,
    palette,
    text,
}: IFormListRecordProps): React.ReactElement {
    const back = onBack !== null ? (
        <View style={{ alignItems: 'flex-start' }}>
            <ListButton label={text.backToList} onPress={onBack} palette={palette} testID="form-list-back" />
        </View>
    ) : null;

    if (panel.kind === 'loading') {
        return (
            <View style={styles.section}>
                {back}
                <View accessibilityLabel={text.loading} accessibilityRole="progressbar" testID="form-list-record-loading">
                    <ActivityIndicator color={palette.primary} />
                </View>
            </View>
        );
    }

    if (panel.kind === 'unavailable') {
        return (
            <View style={styles.section}>
                {back}
                <ListBanner tone="error" palette={palette} testID="form-list-record-unavailable">{text.notFound}</ListBanner>
            </View>
        );
    }

    if (panel.kind === 'create' || panel.kind === 'edit') {
        const cannotEdit = panel.kind === 'edit' && (!panel.selected.can_update || panel.selected.form_values === null);
        return (
            <View style={styles.section} testID="form-list-record-form">
                {back}
                {cannotEdit ? <ListBanner tone="warning" palette={palette}>{text.cannotEdit}</ListBanner> : null}
                {!cannotEdit && conflict !== null ? (
                    <Conflict
                        conflict={conflict}
                        pageId={pageId}
                        sectionId={sectionId}
                        onKeep={onConflictKeep}
                        onReload={onConflictReload}
                        palette={palette}
                        text={text}
                    />
                ) : null}
                {!cannotEdit && formChild === null ? <ListBanner tone="error" palette={palette}>{text.noForm}</ListBanner> : null}
                {!cannotEdit && formChild !== null && formContext !== null ? (
                    <FormListFormContext.Provider key={formKey} value={formContext}>
                        <BasicStyle section={formChild} values={values} />
                    </FormListFormContext.Provider>
                ) : null}
            </View>
        );
    }

    const { selected } = panel;
    const showHistory = historyOffered && selected.can_view_history;
    const details = (
        <View style={styles.section}>
            <RecordView state={state} selected={selected} palette={palette} text={text} />
            <View style={styles.actions}>
                {selected.can_update && formChild !== null ? (
                    <ListButton label={text.edit} onPress={onEdit} palette={palette} testID="form-list-record-edit" />
                ) : null}
                {selected.can_delete ? (
                    <ListButton label={text.delete} tone="danger" onPress={onDelete} palette={palette} testID="form-list-record-delete" />
                ) : null}
            </View>
        </View>
    );

    return (
        <View style={styles.section} testID="form-list-record-view-panel">
            {back}
            {showHistory ? (
                <>
                    <View style={styles.tabs} accessibilityRole="tablist">
                        <ListButton
                            label={text.details}
                            selected={tab === 'details'}
                            onPress={() => onTab('details')}
                            palette={palette}
                            testID="form-list-tab-details"
                        />
                        <ListButton
                            label={text.history}
                            selected={tab === 'history'}
                            onPress={() => onTab('history')}
                            palette={palette}
                            testID="form-list-tab-history"
                        />
                    </View>
                    {tab === 'history' ? (
                        <FormListHistory
                            pageId={pageId}
                            sectionId={sectionId}
                            recordId={selected.record_id}
                            canRestore={selected.can_update}
                            onRestored={onRestored}
                            palette={palette}
                            text={text}
                        />
                    ) : details}
                </>
            ) : details}
        </View>
    );
}
