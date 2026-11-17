/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * What an `entry-form-list` hands to its inline form (`form-log`, `form-record`
 * or `entry-record-form` inside the list).
 *
 * Inside a list the list decides which record is edited (or that a new one is
 * created), which values the form starts with, which version a save is based
 * on, and what happens after the save. The form keeps drawing its own inputs
 * and sends the ordinary form requests (`POST` submit, `PUT` update): a list
 * never has write routes of its own. Outside a list the context is absent and
 * the form behaves as it always did.
 */
import { createContext, useContext } from 'react';
import type { IFormStaleVersionData } from '@selfhelp/shared';

/** The result of a save the list was told about. */
export interface IFormListFormSaved {
    recordId: number | null;
    /** The record's version after the save; null when the server did not say. */
    version: number | null;
    /** True for a new record, false for a change to an existing one. */
    created: boolean;
}

export interface IFormListFormContext {
    /** The record being edited; null when a new record is created. */
    recordId: number | null;
    /** The rows the server sent to prefill the form (`selected.form_values`); null when there is nothing to prefill. */
    prefill: Record<string, unknown> | unknown[] | null;
    /** The record version the save is based on; null when a new record is created. */
    expectedVersion: number | null;
    onSaved: (result: IFormListFormSaved) => void;
    /** The record changed meanwhile: nothing was written and the draft is still in the form. */
    onStale: (stale: IFormStaleVersionData) => void;
    /** The person left the form (the list asks first when there is unsaved input). */
    onCancel: () => void;
    /** The form tells the list how to ask "is there unsaved input?"; `null` withdraws the check. */
    registerDirtyCheck: (check: (() => boolean) | null) => void;
}

export const FormListFormContext = createContext<IFormListFormContext | null>(null);

/** The list that draws this form, or `null` for a form outside any list. */
export function useFormListForm(): IFormListFormContext | null {
    return useContext(FormListFormContext);
}
