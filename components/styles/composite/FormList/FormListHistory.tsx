/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import {
    getFormListFailure,
    getFormListRestoreBlocked,
    getFormStaleVersion,
    type IFormListRestoreBlocker,
    type IFormListRestorePreview,
    type IFormListRestoreResult,
    type IFormListRevision,
} from '@selfhelp/shared';

import { useWritePreview } from '@/hooks/useWritePreview';
import { downloadHistoricalFile } from '@/services/formListFileDownload';
import {
    fileVersionsOfComparison,
    fileVersionsOfRevision,
    historicalFileFailure,
} from '@/services/formListFiles';
import {
    useFormListCompare,
    useFormListHistory,
    useFormListRestoreMutation,
    useFormListVersion,
} from './FormList.hooks';
import { FormListChanges, FormListFiles, fileDownloadKey } from './FormListChanges';
import type { IFormListFileDownload } from './FormList.types';
import { FormListConfirm } from './FormListConfirm';
import { ListBanner, ListButton, ListText } from './FormListPrimitives';
import { styles, type IListPalette } from './FormList.styles';
import {
    BLOCKER_WORDS,
    blockerKey,
    describeRevision,
    formatEntryDate,
    historyTotalPages,
    planRestore,
    togglePickedVersion,
    type TFormListText,
} from './FormList.logic';

interface IFormListHistoryProps {
    pageId: number;
    sectionId: number;
    recordId: number;
    /** The viewer may change the record, so restoring a version is offered. */
    canRestore: boolean;
    /** A restore was applied: the caller refreshes what it shows and says so. */
    onRestored: (result: IFormListRestoreResult) => void;
    palette: IListPalette;
    text: TFormListText;
}

function Loading({ palette, text }: { palette: IListPalette; text: TFormListText }): React.ReactElement {
    return (
        <View style={styles.loadingBox} accessibilityLabel={text.loading} accessibilityRole="progressbar">
            <ActivityIndicator color={palette.primary} />
        </View>
    );
}

/**
 * The versions of one record: who changed it and when, what one version
 * changed, a comparison of two versions, and a validated restore.
 *
 * The server decides what the viewer may see: hidden fields and unreadable
 * files are left out of the changes and cannot be restored by this viewer. A
 * restore never rewinds history; it is a new version.
 */
export function FormListHistory({ pageId, sectionId, recordId, canRestore, onRestored, palette, text }: IFormListHistoryProps): React.ReactElement {
    const target = { pageId, sectionId, recordId };
    const [page, setPage] = useState(1);
    const [picked, setPicked] = useState<number[]>([]);
    const [detail, setDetail] = useState<number | null>(null);
    const [compare, setCompare] = useState<{ from: number; to: number } | null>(null);
    const [restoreOf, setRestoreOf] = useState<number | null>(null);

    const history = useFormListHistory(target, page);
    const version = useFormListVersion(target, detail);
    const comparison = useFormListCompare(target, compare?.from ?? null, compare?.to ?? null);

    // A file of an earlier version is read with the person's session (the server checks the access to the history),
    // kept in the app cache and handed to the share sheet. A historical file is read on the page version the history was.
    const preview = useWritePreview();
    const [downloading, setDownloading] = useState<string | null>(null);
    const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
    const download = useCallback((request: IFormListFileDownload) => {
        setDownloadNotice(null);
        setDownloading(fileDownloadKey(request));
        downloadHistoricalFile(
            {
                sectionId,
                recordId,
                version: request.version,
                fieldKey: request.fieldKey,
                languageId: request.languageId,
                index: request.file.index,
                pageId,
                preview,
            },
            request.file.name,
        )
            .then((result) => {
                if (result.kind === 'saved') {
                    setDownloadNotice(text.historyDownloadSaved);
                }
            })
            .catch((error: unknown) => {
                const failure = historicalFileFailure(error);
                setDownloadNotice(
                    failure === 'denied' ? text.historyDownloadDenied
                        : failure === 'gone' ? text.historyDownloadGone
                            : text.historyDownloadFailed,
                );
            })
            .finally(() => setDownloading(null));
    }, [sectionId, recordId, pageId, preview, text.historyDownloadSaved, text.historyDownloadDenied, text.historyDownloadGone, text.historyDownloadFailed]);

    if (history.isLoading) {
        return <Loading palette={palette} text={text} />;
    }
    if (history.error || !history.data) {
        const failure = getFormListFailure(history.error);
        return (
            <ListBanner tone="error" title={text.history} palette={palette}>
                {failure?.status === 403 ? text.historyDenied : text.loadFailed}
            </ListBanner>
        );
    }

    const data = history.data;
    const totalPages = historyTotalPages(data.total, data.page_size);

    const describePair = (revision: IFormListRevision): string => {
        const fields = revision.changed_fields > 0
            ? `, ${revision.changed_fields} field${revision.changed_fields === 1 ? '' : 's'} changed`
            : '';
        return `${formatEntryDate(revision.created_at)} UTC${fields}`;
    };

    return (
        <View style={styles.section} testID="form-list-history">
            {downloadNotice !== null ? (
                <ListBanner tone="warning" palette={palette} testID="form-list-download-notice">{downloadNotice}</ListBanner>
            ) : null}
            {data.items.length === 0 ? <ListText palette={palette} muted>{text.historyEmpty}</ListText> : null}

            {data.items.map((revision) => {
                const isCurrent = revision.version === data.current_version;
                const isPicked = picked.includes(revision.version);
                return (
                    <View
                        key={revision.version}
                        style={[styles.revision, { borderColor: palette.border, backgroundColor: palette.surface }]}
                        testID={`form-list-version-${revision.version}`}
                    >
                        <View style={styles.revisionHead}>
                            <Pressable
                                onPress={() => setPicked((current) => togglePickedVersion(current, revision.version))}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: isPicked }}
                                accessibilityLabel={`${text.historyChecks}: version ${revision.version}`}
                                style={styles.pickBox}
                                testID={`form-list-pick-${revision.version}`}
                            >
                                <View style={[styles.pickMark, { borderColor: palette.textMuted, backgroundColor: isPicked ? palette.primaryStrong : 'transparent' }]}>
                                    {isPicked ? <Text style={{ color: palette.onPrimary, fontSize: 14, fontWeight: '700' }}>{'\u2713'}</Text> : null}
                                </View>
                            </Pressable>
                            <View style={{ flex: 1, gap: 2 }}>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                                    <ListText palette={palette} bold>{`Version ${revision.version}`}</ListText>
                                    {isCurrent ? (
                                        <View style={[styles.badge, { borderColor: palette.border, backgroundColor: palette.surfaceMuted }]}>
                                            <Text style={[styles.badgeText, { color: palette.text }]}>{text.historyCurrent}</Text>
                                        </View>
                                    ) : null}
                                    {revision.is_checkpoint ? (
                                        <View style={[styles.badge, { borderColor: palette.border }]}>
                                            <Text style={[styles.badgeText, { color: palette.text }]}>checkpoint</Text>
                                        </View>
                                    ) : null}
                                </View>
                                <ListText palette={palette}>{describeRevision(revision)}</ListText>
                                <ListText palette={palette} muted size={13}>{describePair(revision)}</ListText>
                            </View>
                        </View>
                        <View style={styles.actions}>
                            <ListButton
                                label={text.details}
                                accessibilityLabel={`${text.details} of version ${revision.version}`}
                                onPress={() => { setCompare(null); setDetail(revision.version); }}
                                palette={palette}
                                testID={`form-list-version-details-${revision.version}`}
                            />
                            {!isCurrent ? (
                                <ListButton
                                    label={text.historyCompareCurrent}
                                    accessibilityLabel={`${text.historyCompareCurrent}: version ${revision.version}`}
                                    onPress={() => { setDetail(null); setCompare({ from: revision.version, to: data.current_version }); }}
                                    palette={palette}
                                    testID={`form-list-version-compare-${revision.version}`}
                                />
                            ) : null}
                            {canRestore && !isCurrent && revision.operation !== 'delete' ? (
                                <ListButton
                                    label={text.historyRestore}
                                    accessibilityLabel={`${text.historyRestore}: version ${revision.version}`}
                                    onPress={() => setRestoreOf(revision.version)}
                                    palette={palette}
                                    testID={`form-list-version-restore-${revision.version}`}
                                />
                            ) : null}
                        </View>
                    </View>
                );
            })}

            <View style={styles.pager}>
                <ListButton
                    label={text.historyCompare}
                    disabled={picked.length !== 2}
                    onPress={() => {
                        const [first, second] = [...picked].sort((a, b) => a - b);
                        setDetail(null);
                        setCompare({ from: first, to: second });
                    }}
                    palette={palette}
                    testID="form-list-compare-selected"
                />
                {totalPages > 1 ? (
                    <View style={styles.pager}>
                        <ListButton
                            label={text.previous}
                            disabled={page <= 1}
                            onPress={() => setPage((current) => Math.max(1, current - 1))}
                            palette={palette}
                            testID="form-list-history-previous"
                        />
                        <ListText palette={palette} muted size={14}>{`${page} / ${totalPages}`}</ListText>
                        <ListButton
                            label={text.next}
                            disabled={page >= totalPages}
                            onPress={() => setPage((current) => Math.min(totalPages, current + 1))}
                            palette={palette}
                            testID="form-list-history-next"
                        />
                    </View>
                ) : null}
            </View>

            {detail !== null ? (
                <View style={[styles.revision, { borderColor: palette.border, backgroundColor: palette.surface }]} accessibilityLiveRegion="polite" testID="form-list-history-version">
                    <ListText palette={palette} bold>{`Version ${detail}`}</ListText>
                    {version.isLoading ? <Loading palette={palette} text={text} /> : null}
                    {version.error ? <ListBanner tone="error" palette={palette}>{text.loadFailed}</ListBanner> : null}
                    {version.data ? (
                        <View style={styles.section}>
                            <ListText palette={palette} bold>What this version changed</ListText>
                            <FormListChanges
                                changes={version.data.revision.changes}
                                palette={palette}
                                text={text}
                                versions={fileVersionsOfRevision(detail)}
                                onDownload={download}
                                busyKey={downloading}
                            />
                            <ListText palette={palette} bold>The entry after this version</ListText>
                            {version.data.state.fields.map((field) => (
                                <View key={`${field.field_key}-${field.language_id}`} style={styles.cell}>
                                    <Text style={[styles.detailLabel, { color: palette.textMuted }]}>{field.field_label ?? field.field_key}</Text>
                                    {field.kind === 'file' ? (
                                        field.files.length === 0 ? (
                                            <ListText palette={palette}>-</ListText>
                                        ) : (
                                            <FormListFiles
                                                label="Files"
                                                files={field.files}
                                                version={detail}
                                                fieldKey={field.field_key}
                                                languageId={field.language_id}
                                                palette={palette}
                                                text={text}
                                                onDownload={download}
                                                busyKey={downloading}
                                            />
                                        )
                                    ) : (
                                        <ListText palette={palette}>{field.value ?? '-'}</ListText>
                                    )}
                                </View>
                            ))}
                        </View>
                    ) : null}
                </View>
            ) : null}

            {compare !== null ? (
                <View style={[styles.revision, { borderColor: palette.border, backgroundColor: palette.surface }]} accessibilityLiveRegion="polite" testID="form-list-history-compare">
                    <ListText palette={palette} bold>{`Version ${compare.from} compared with version ${compare.to}`}</ListText>
                    {comparison.isLoading ? <Loading palette={palette} text={text} /> : null}
                    {comparison.error ? <ListBanner tone="error" palette={palette}>{text.loadFailed}</ListBanner> : null}
                    {comparison.data ? (
                        <FormListChanges
                            changes={comparison.data.changes}
                            palette={palette}
                            text={text}
                            versions={fileVersionsOfComparison(compare.from, compare.to)}
                            onDownload={download}
                            busyKey={downloading}
                        />
                    ) : null}
                </View>
            ) : null}

            {restoreOf !== null ? (
                <RestoreDialog
                    pageId={pageId}
                    sectionId={sectionId}
                    recordId={recordId}
                    version={restoreOf}
                    currentVersion={data.current_version}
                    palette={palette}
                    text={text}
                    onClose={() => setRestoreOf(null)}
                    onRestored={(result) => {
                        setRestoreOf(null);
                        setPicked([]);
                        setDetail(null);
                        setCompare(null);
                        onRestored(result);
                    }}
                    onStale={() => { void history.refetch(); }}
                />
            ) : null}
        </View>
    );
}

interface IRestoreDialogProps {
    pageId: number;
    sectionId: number;
    recordId: number;
    version: number;
    currentVersion: number;
    palette: IListPalette;
    text: TFormListText;
    onClose: () => void;
    onRestored: (result: IFormListRestoreResult) => void;
    onStale: () => void;
}

/** The dry run of a restore (what it would change, what blocks it) and the confirmed restore. */
function RestoreDialog({ pageId, sectionId, recordId, version, currentVersion, palette, text, onClose, onRestored, onStale }: IRestoreDialogProps): React.ReactElement {
    const preview = useFormListRestoreMutation(pageId, sectionId);
    const apply = useFormListRestoreMutation(pageId, sectionId);
    const [blockedByServer, setBlockedByServer] = useState<IFormListRestoreBlocker[] | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const { mutate: runPreview } = preview;

    useEffect(() => {
        runPreview({ recordId, version, dry_run: true });
    }, [runPreview, recordId, version]);

    const previewData: IFormListRestorePreview | null = preview.data && preview.data.dry_run ? preview.data : null;
    const plan = planRestore(previewData, blockedByServer);

    const confirm = () => {
        setNotice(null);
        apply.mutate(
            {
                recordId,
                version,
                expected_version: currentVersion,
                ...(plan.partial ? { field_keys: plan.allowedFields } : {}),
            },
            {
                onSuccess: (result) => {
                    if (!result.dry_run) {
                        onRestored(result);
                    }
                },
                onError: (error) => {
                    if (getFormStaleVersion(error) !== null) {
                        setNotice(text.conflictDeleteBody);
                        onStale();
                        return;
                    }
                    const blocked = getFormListRestoreBlocked(error);
                    if (blocked !== null) {
                        setBlockedByServer(blocked.blockers);
                        return;
                    }
                    setNotice(text.loadFailed);
                },
            },
        );
    };

    const failure = preview.error ? getFormListFailure(preview.error) : null;

    return (
        <FormListConfirm
            visible
            title={`${text.historyRestore} (${version})`}
            confirmLabel={plan.partial ? text.historyRestoreOnlyPossible : text.historyRestoreConfirm}
            cancelLabel={text.cancel}
            confirmTone="primary"
            busy={apply.isPending}
            hideConfirm={!plan.canConfirm}
            onConfirm={confirm}
            onCancel={onClose}
            palette={palette}
            testID="form-list-restore-dialog"
            notice={
                <>
                    {notice !== null ? <ListBanner tone="warning" palette={palette}>{notice}</ListBanner> : null}
                    {plan.blockers.length > 0 ? (
                        <ListBanner tone="warning" title={text.historyBlockedTitle} palette={palette}>
                            <View style={{ gap: 4 }}>
                                {plan.blockers.map((blocker) => (
                                    <ListText key={blockerKey(blocker.field_key, blocker.language_id)} palette={palette}>
                                        {`${blocker.field_label ?? blocker.field_key}: ${BLOCKER_WORDS[blocker.reason]}`}
                                    </ListText>
                                ))}
                            </View>
                        </ListBanner>
                    ) : null}
                </>
            }
        >
            {preview.isPending ? <Loading palette={palette} text={text} /> : null}
            {failure !== null ? (
                <ListText palette={palette}>{failure.status === 403 ? text.historyDenied : text.loadFailed}</ListText>
            ) : null}
            {plan.nothing ? <ListText palette={palette}>{text.historyNothingToRestore}</ListText> : null}
            {previewData !== null && previewData.changes.length > 0 ? (
                <View style={{ gap: 8 }}>
                    <ListText palette={palette} bold>{text.historyRestorePreview}</ListText>
                    {previewData.changes.map((change) => (
                        <View key={blockerKey(change.field_key, change.language_id)} style={styles.changeRow}>
                            <ListText palette={palette} bold>{change.field_label ?? change.field_key}</ListText>
                            <ListText palette={palette}>
                                {change.action === 'remove'
                                    ? 'Will be removed'
                                    : `Will be set to: ${change.kind === 'file'
                                        ? (change.after_files ?? []).map((file) => file.name).join(', ') || 'no file'
                                        : (change.after ?? 'empty')}`}
                            </ListText>
                        </View>
                    ))}
                </View>
            ) : null}
        </FormListConfirm>
    );
}
