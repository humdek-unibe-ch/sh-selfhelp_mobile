/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Native side of reading a file an earlier version of a record held: the app
 * asks the server for the bytes with the visitor's session (the same client
 * every other request uses, so a token that ran out is renewed once), keeps
 * them in the app cache under a name that cannot leave it, and opens the
 * system share sheet ("save to Files", "open with ..."). Nothing is stored
 * anywhere else; the cache may be emptied by the system at any time.
 *
 * The request, the names and the meaning of a refusal are pure and tested in
 * `formListFiles.ts`; this module needs the phone (`expo-file-system`,
 * `expo-sharing`), so the native evidence covers it.
 */
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { getApiClient } from '@/services/apiClient';
import {
    cachedFileName,
    downloadFileName,
    historicalFileRequest,
    mimeTypeOfFileName,
    type IHistoricalFileTarget,
} from '@/services/formListFiles';
import { currentFileRequest, type ICurrentFileTarget } from '@/services/listFileLink';

/** Where the files of this feature live inside the cache. */
const FOLDER_NAME = 'selfhelp-history-files';

/** What happened to the file. */
export type THistoricalFileResult =
    /** The share sheet was opened. */
    | { kind: 'shared'; uri: string }
    /** The phone has no share sheet; the file is in the app cache. */
    | { kind: 'saved'; uri: string };

/**
 * Remove every file this feature kept. Logout, a rejected refresh and a server
 * switch call it (`clearClientCaches`): a downloaded file of an earlier version
 * is a private copy and must not outlive the session that was allowed to read it.
 * A folder that is not there is not a failure.
 */
export async function clearHistoricalFiles(): Promise<void> {
    const directory = new Directory(Paths.cache, FOLDER_NAME);
    if (directory.exists) {
        directory.delete();
    }
}

/**
 * Download one historical file and hand it to the phone. Throws the axios
 * error of a refused or failed request (read it with `historicalFileFailure`).
 */
export async function downloadHistoricalFile(target: IHistoricalFileTarget, name: string): Promise<THistoricalFileResult> {
    const { url, params } = historicalFileRequest(target);
    const response = await getApiClient().get<ArrayBuffer>(url, {
        params,
        responseType: 'arraybuffer',
        // The route answers with the file whatever the client accepts; this request is not a JSON call.
        headers: { Accept: '*/*' },
    });

    const directory = new Directory(Paths.cache, FOLDER_NAME);
    directory.create({ idempotent: true, intermediates: true });
    const file = new File(directory, cachedFileName(target.version, name));
    file.create({ overwrite: true });
    file.write(new Uint8Array(response.data));

    if (!(await Sharing.isAvailableAsync())) {
        return { kind: 'saved', uri: file.uri };
    }
    await Sharing.shareAsync(file.uri, { mimeType: mimeTypeOfFileName(name), dialogTitle: name });

    return { kind: 'shared', uri: file.uri };
}

/**
 * Download the current file of a record (public `__links` press) with the
 * visitor's session and open the share sheet. Same cache folder as history so
 * logout / clearClientCaches empties both.
 */
export async function downloadCurrentFile(target: ICurrentFileTarget, name: string): Promise<THistoricalFileResult> {
    const { url, params } = currentFileRequest(target);
    const response = await getApiClient().get<ArrayBuffer>(url, {
        params,
        responseType: 'arraybuffer',
        headers: { Accept: '*/*' },
    });

    const directory = new Directory(Paths.cache, FOLDER_NAME);
    directory.create({ idempotent: true, intermediates: true });
    const safeName = downloadFileName(name);
    const file = new File(directory, `current-${target.recordId}-${target.index}-${safeName}`);
    file.create({ overwrite: true });
    file.write(new Uint8Array(response.data));

    if (!(await Sharing.isAvailableAsync())) {
        return { kind: 'saved', uri: file.uri };
    }
    await Sharing.shareAsync(file.uri, { mimeType: mimeTypeOfFileName(safeName), dialogTitle: safeName });

    return { kind: 'shared', uri: file.uri };
}
