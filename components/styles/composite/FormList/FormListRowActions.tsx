/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import type { IFormListQuickActionInfo, IFormListRow } from '@selfhelp/shared';

import { ListButton } from './FormListPrimitives';
import type { IListPalette } from './FormList.styles';
import { applicableQuickActions, type TFormListKind, type TFormListOpenTab, type TFormListText } from './FormList.logic';

interface IFormListRowActionsProps {
    row: IFormListRow;
    /** The record's short name, used in spoken names ("Edit Write report"). */
    label: string;
    /** `entry-form-list` draws the write actions; `data-view` only links to the detail page. */
    kind: TFormListKind;
    /** The list offers history (`show_history` and the server's capability). */
    historyOffered: boolean;
    /** The quick actions of the list; the row says which of them apply. */
    quickActions: readonly IFormListQuickActionInfo[];
    palette: IListPalette;
    text: TFormListText;
    onOpen: (mode: 'view' | 'edit', tab: TFormListOpenTab) => void;
    onDelete: () => void;
    onQuickAction: (action: IFormListQuickActionInfo) => void;
    onOpenDetail: () => void;
}

/**
 * What the visitor may do with one record. The row's flags are the server's
 * rendering hints (the server checks again on every write); quick actions are
 * offered only when the row lists them.
 */
export function FormListRowActions({
    row,
    label,
    kind,
    historyOffered,
    quickActions,
    palette,
    text,
    onOpen,
    onDelete,
    onQuickAction,
    onOpenDetail,
}: IFormListRowActionsProps): React.ReactElement | null {
    if (kind === 'data-view') {
        if (row.detail_url === null) {
            return null;
        }
        return (
            <ListButton
                label={text.view}
                accessibilityLabel={`${text.view} ${label}`}
                onPress={onOpenDetail}
                palette={palette}
                testID={`form-list-view-${row.record_id}`}
            />
        );
    }

    const applicable = applicableQuickActions(row, quickActions);

    return (
        <>
            <ListButton
                label={text.view}
                accessibilityLabel={`${text.view} ${label}`}
                onPress={() => onOpen('view', 'details')}
                palette={palette}
                testID={`form-list-view-${row.record_id}`}
            />
            {row.can_update ? (
                <ListButton
                    label={text.edit}
                    accessibilityLabel={`${text.edit} ${label}`}
                    onPress={() => onOpen('edit', 'details')}
                    palette={palette}
                    testID={`form-list-edit-${row.record_id}`}
                />
            ) : null}
            {historyOffered && row.can_view_history ? (
                <ListButton
                    label={text.history}
                    accessibilityLabel={`${text.history} ${label}`}
                    onPress={() => onOpen('view', 'history')}
                    palette={palette}
                    testID={`form-list-history-${row.record_id}`}
                />
            ) : null}
            {applicable.map((action) => (
                <ListButton
                    key={action.id}
                    label={action.label}
                    accessibilityLabel={`${action.label} ${label}`}
                    onPress={() => onQuickAction(action)}
                    palette={palette}
                    testID={`form-list-action-${action.id}-${row.record_id}`}
                />
            ))}
            {row.can_delete ? (
                <ListButton
                    label={text.delete}
                    accessibilityLabel={`${text.delete} ${label}`}
                    onPress={onDelete}
                    tone="danger"
                    palette={palette}
                    testID={`form-list-delete-${row.record_id}`}
                />
            ) : null}
        </>
    );
}
