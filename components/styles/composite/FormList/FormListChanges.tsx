/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Text, View } from 'react-native';
import type { IFormListHistoricalFile, TFormListChange } from '@selfhelp/shared';

import type { IChangeVersions } from '@/services/formListFiles';
import { ListButton, ListText } from './FormListPrimitives';
import { styles, type IListPalette } from './FormList.styles';
import type { TFormListText } from './FormList.logic';
import type { IFormListFileDownload } from './FormList.types';

const CHANGE_WORDS: Record<TFormListChange['change'], string> = {
    added: 'Added',
    changed: 'Changed',
    removed: 'Removed',
};

interface IFilesProps {
    label: string;
    files: readonly IFormListHistoricalFile[];
    /** The version these files belong to; null when there is none (nothing came before the first version). */
    version: number | null;
    fieldKey: string;
    languageId: number;
    palette: IListPalette;
    text: TFormListText;
    onDownload?: (request: IFormListFileDownload) => void;
    /** The download that is running (`version:field:language:index`). */
    busyKey?: string | null;
}

/** The key that names one file of one version. */
export function fileDownloadKey(request: IFormListFileDownload): string {
    return `${request.version}:${request.fieldKey}:${request.languageId}:${request.file.index}`;
}

/**
 * The files a version held, one line each: the name, and a "Download" button while the file is still there.
 * A file that was erased since says so. The server checks the access to the history when the file is read.
 */
export function FormListFiles({ label, files, version, fieldKey, languageId, palette, text, onDownload, busyKey = null }: IFilesProps): React.ReactElement {
    if (files.length === 0) {
        return <ListText palette={palette}>{`${label}: no file`}</ListText>;
    }

    return (
        <View style={{ gap: 6 }}>
            <ListText palette={palette}>{`${label}:`}</ListText>
            {files.map((file) => {
                const request: IFormListFileDownload | null = version === null
                    ? null
                    : { version, fieldKey, languageId, file };
                const key = request === null ? null : fileDownloadKey(request);
                return (
                    <View key={`${file.index}-${file.name}`} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                        <ListText palette={palette}>
                            {file.available ? file.name : `${file.name} (${text.historyAvailableNo})`}
                        </ListText>
                        {file.available && request !== null && onDownload !== undefined ? (
                            <ListButton
                                label={text.historyDownload}
                                accessibilityLabel={`${text.historyDownload}: ${file.name}`}
                                onPress={() => onDownload(request)}
                                busy={busyKey !== null && busyKey === key}
                                disabled={busyKey !== null && busyKey !== key}
                                palette={palette}
                                testID={`form-list-download-${key}`}
                            />
                        ) : null}
                    </View>
                );
            })}
        </View>
    );
}

interface IFormListChangesProps {
    changes: readonly TFormListChange[];
    palette: IListPalette;
    text: TFormListText;
    /**
     * The versions the two sides of a change belong to; a file can be downloaded only when they are known and
     * `onDownload` is given.
     */
    versions?: IChangeVersions;
    onDownload?: (request: IFormListFileDownload) => void;
    busyKey?: string | null;
}

/**
 * What changed between two states of a record: one block per field, with the
 * value before and after. The server already left out fields and files the
 * viewer may not see; this draws what it sent. The kind of change is a word,
 * not only a colour.
 */
export function FormListChanges({ changes, palette, text, versions, onDownload, busyKey }: IFormListChangesProps): React.ReactElement {
    if (changes.length === 0) {
        return <ListText palette={palette} muted>{text.nothingChanged}</ListText>;
    }

    return (
        <View style={{ gap: 10 }} testID="form-list-changes">
            {changes.map((change) => (
                <View key={`${change.field_key}-${change.language_id}-${change.kind}`} style={styles.changeRow}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                        <ListText palette={palette} bold>{change.field_label ?? change.field_key}</ListText>
                        <View style={[styles.badge, { borderColor: palette.border, backgroundColor: palette.surfaceMuted }]}>
                            <Text style={[styles.badgeText, { color: palette.text }]}>{CHANGE_WORDS[change.change]}</Text>
                        </View>
                        {change.language_id > 1 ? (
                            <Text style={{ color: palette.textMuted, fontSize: 12 }}>{`language ${change.language_id}`}</Text>
                        ) : null}
                    </View>
                    {change.kind === 'file' ? (
                        <>
                            <FormListFiles
                                label="Before"
                                files={change.before_files}
                                version={versions?.before ?? null}
                                fieldKey={change.field_key}
                                languageId={change.language_id}
                                palette={palette}
                                text={text}
                                onDownload={onDownload}
                                busyKey={busyKey}
                            />
                            <FormListFiles
                                label="After"
                                files={change.after_files}
                                version={versions?.after ?? null}
                                fieldKey={change.field_key}
                                languageId={change.language_id}
                                palette={palette}
                                text={text}
                                onDownload={onDownload}
                                busyKey={busyKey}
                            />
                        </>
                    ) : (
                        <>
                            <ListText palette={palette}>{`Before: ${change.before === null ? 'empty' : change.before}`}</ListText>
                            <ListText palette={palette}>{`After: ${change.after === null ? 'empty' : change.after}`}</ListText>
                            {change.truncated ? (
                                <ListText palette={palette} muted size={13}>The value is shown shortened.</ListText>
                            ) : null}
                        </>
                    )}
                </View>
            ))}
        </View>
    );
}
