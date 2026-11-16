/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import type { IFormListHistoricalFile, IFormListQuickActionInfo, IFormListRow } from '@selfhelp/shared';

/** The record a delete dialog is asking about. */
export interface IFormListDeleteTarget {
    recordId: number;
    /** The version the person saw; sent back so a stale delete is refused. */
    version: number;
    /** The record's short name for the question and the buttons. */
    label: string;
}

/** The quick action a confirmation dialog is asking about. */
export interface IFormListQuickTarget {
    action: IFormListQuickActionInfo;
    row: IFormListRow;
    label: string;
}

/** One file of an earlier version the person asks to download. */
export interface IFormListFileDownload {
    /** The version the file belongs to (the state of the record after it holds the file). */
    version: number;
    fieldKey: string;
    /** The language of the stored value. */
    languageId: number;
    file: IFormListHistoricalFile;
}

/** A refusal shown above the list: the entry changed meanwhile, or the request failed. */
export interface IFormListNotice {
    tone: 'conflict' | 'error';
    message: string;
}
