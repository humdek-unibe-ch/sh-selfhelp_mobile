/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { IFormListColumn, IFormListRow, IFormListState } from '@selfhelp/shared';

import { BasicStyle } from '@/components/renderer/BasicStyle';
import { FormListCell } from './FormListCell';
import { ListButton } from './FormListPrimitives';
import { styles, type IListPalette } from './FormList.styles';
import { cellOf, formatListCell, isFileCell, rowLabel, rowTemplateSections, type TFormListText } from './FormList.logic';

interface IRowsProps {
    state: IFormListState;
    palette: IListPalette;
    text: TFormListText;
    /** True while a read is running behind the rows. */
    busy: boolean;
    /** Opening a row (the whole row is the target); null when the row offers nothing to open. */
    onOpenRow: ((row: IFormListRow) => void) | null;
    renderActions: (row: IFormListRow, label: string) => ReactNode;
    /** The row has anything to offer below its content. */
    hasActions: (row: IFormListRow) => boolean;
}

interface IRowFrameProps {
    row: IFormListRow;
    label: string;
    palette: IListPalette;
    text: TFormListText;
    onOpenRow: IRowsProps['onOpenRow'];
    style: object;
    children: ReactNode;
    actions: ReactNode;
}

/** The frame of one record: its content opens it, its actions stay separate buttons. */
function RowFrame({ row, label, palette, text, onOpenRow, style, children, actions }: IRowFrameProps): React.ReactElement {
    return (
        <View
            style={[style, { borderColor: palette.border, backgroundColor: palette.surface }]}
            testID={`form-list-row-${row.record_id}`}
        >
            {onOpenRow !== null ? (
                <Pressable
                    onPress={() => onOpenRow(row)}
                    accessibilityRole="button"
                    accessibilityLabel={`${text.view} ${label}`}
                    style={({ pressed }) => [styles.cardBody, pressed ? { opacity: 0.7 } : null]}
                >
                    {children}
                </Pressable>
            ) : (
                <View style={styles.cardBody}>{children}</View>
            )}
            {actions}
        </View>
    );
}

function ActionsRow({ children }: { children: ReactNode }): React.ReactElement | null {
    return children ? <View style={styles.actions}>{children}</View> : null;
}

/** The rows as cards: one card per record, label above value. */
export function FormListCards({ state, palette, text, busy, onOpenRow, renderActions, hasActions }: IRowsProps): React.ReactElement {
    return (
        <View style={{ gap: 10, opacity: busy ? 0.7 : 1 }} testID="form-list-cards">
            {state.rows.map((row) => {
                const label = rowLabel(row, state.columns);
                return (
                    <RowFrame
                        key={row.record_id}
                        row={row}
                        label={label}
                        palette={palette}
                        text={text}
                        onOpenRow={onOpenRow}
                        style={styles.card}
                        actions={hasActions(row) ? <ActionsRow>{renderActions(row, label)}</ActionsRow> : null}
                    >
                        {state.columns.map((column) => (
                            <View key={column.field} style={styles.cell}>
                                <Text style={[styles.cellLabel, { color: palette.textMuted }]}>{column.label}</Text>
                                <FormListCell value={cellOf(row.values, column)} column={column} palette={palette} text={text} />
                            </View>
                        ))}
                    </RowFrame>
                );
            })}
        </View>
    );
}

/**
 * The author's sections bring their own design, so a template needs no palette and no row controls of the
 * list: a data view is read only, and a button that opens the record is something the author draws.
 */
interface ITemplateRowsProps extends Pick<IRowsProps, 'state' | 'text' | 'busy' | 'onOpenRow'> {
    /** The values the page interpolates with, passed on to the sections of every record. */
    values: Record<string, unknown>;
}

/**
 * The rows of a `custom` layout: the sections the author composed for ONE record, which the server drew once
 * per record (their tokens are already the record's values). A phone draws them with the ordinary section
 * renderer, so the author's `css_mobile` classes are the design; the classes of the element that holds the
 * records (`list_row_css`) are web only and not used here. A record that can be opened (the author set a detail
 * page) is one target for the whole record; no generic "View" button is added below it, as on the web, because
 * the author's own sections (a link button, for instance) are what the visitor sees.
 */
export function FormListTemplateRows({ state, text, busy, onOpenRow, values }: ITemplateRowsProps): React.ReactElement {
    return (
        <View style={{ gap: 12, opacity: busy ? 0.7 : 1 }} testID="form-list-custom">
            {state.rows.map((row) => {
                const label = rowLabel(row, state.columns);
                const card = (
                    <View testID={`form-list-row-${row.record_id}`}>
                        {rowTemplateSections(row).map((section) => (
                            <BasicStyle key={section.id} section={section} values={values} />
                        ))}
                    </View>
                );

                return onOpenRow !== null ? (
                    <Pressable
                        key={row.record_id}
                        onPress={() => onOpenRow(row)}
                        accessibilityRole="button"
                        accessibilityLabel={`${text.view} ${label}`}
                        style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}
                    >
                        {card}
                    </Pressable>
                ) : (
                    <View key={row.record_id}>{card}</View>
                );
            })}
        </View>
    );
}

/** The first column that has text names a dense row; the rest follow as `label value` pairs. */
function titleColumn(row: IFormListRow, columns: readonly IFormListColumn[]): IFormListColumn | null {
    return columns.find((column) => {
        const value = cellOf(row.values, column);
        return !isFileCell(value) && formatListCell(value, column.format).trim() !== '';
    }) ?? null;
}

/**
 * The rows of a `table` layout as dense rows. A phone has no room for columns
 * side by side, so each record is one compact row: its first value as the
 * title, the other columns as `label value` pairs below.
 */
export function FormListDenseRows({ state, palette, text, busy, onOpenRow, renderActions, hasActions }: IRowsProps): React.ReactElement {
    return (
        <View style={{ gap: 8, opacity: busy ? 0.7 : 1 }} testID="form-list-table">
            {state.rows.map((row) => {
                const label = rowLabel(row, state.columns);
                const title = titleColumn(row, state.columns);
                return (
                    <RowFrame
                        key={row.record_id}
                        row={row}
                        label={label}
                        palette={palette}
                        text={text}
                        onOpenRow={onOpenRow}
                        style={styles.denseRow}
                        actions={hasActions(row) ? <ActionsRow>{renderActions(row, label)}</ActionsRow> : null}
                    >
                        {title !== null ? (
                            <Text style={[styles.cardTitle, { color: palette.text }]}>
                                {formatListCell(cellOf(row.values, title), title.format)}
                            </Text>
                        ) : null}
                        <View style={styles.densePairs}>
                            {state.columns.filter((column) => column !== title).map((column) => (
                                <View key={column.field} style={styles.densePair}>
                                    <Text style={[styles.cellLabel, { color: palette.textMuted }]}>{column.label}</Text>
                                    <FormListCell value={cellOf(row.values, column)} column={column} palette={palette} text={text} />
                                </View>
                            ))}
                        </View>
                    </RowFrame>
                );
            })}
        </View>
    );
}

interface ISortBarProps {
    state: IFormListState;
    palette: IListPalette;
    text: TFormListText;
    onSort: (field: string) => void;
}

/** What a table has in its headers: one button per sortable column, with the direction that is in effect. */
export function FormListSortBar({ state, palette, text, onSort }: ISortBarProps): React.ReactElement | null {
    const sortable = state.columns.filter((column) => column.sortable);
    if (sortable.length === 0) {
        return null;
    }
    const first = state.state.sort[0];

    return (
        <View style={styles.sortRow} accessibilityRole="toolbar" accessibilityLabel={text.sortBy}>
            <Text style={[styles.cellLabel, { color: palette.textMuted }]}>{text.sortBy}</Text>
            {sortable.map((column) => {
                const active = first !== undefined && first.field === column.field;
                const arrow = active ? (first.direction === 'asc' ? ' \u2191' : ' \u2193') : '';
                const spoken = active
                    ? `${text.sortBy} ${column.label}, ${first.direction === 'asc' ? 'ascending' : 'descending'}`
                    : `${text.sortBy} ${column.label}`;
                return (
                    <ListButton
                        key={column.field}
                        label={`${column.label}${arrow}`}
                        accessibilityLabel={spoken}
                        onPress={() => onSort(column.field)}
                        palette={palette}
                        selected={active}
                        testID={`form-list-sort-${column.field}`}
                    />
                );
            })}
        </View>
    );
}
