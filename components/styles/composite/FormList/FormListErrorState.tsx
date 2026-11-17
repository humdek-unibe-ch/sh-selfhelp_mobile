/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { View } from 'react-native';
import type { IFormListFailure } from '@selfhelp/shared';

import { ListBanner, ListButton } from './FormListPrimitives';
import { styles, type IListPalette } from './FormList.styles';
import { canRetryFailure, canShowAllFailure, failureMessage, type TFormListText } from './FormList.logic';

interface IFormListErrorStateProps {
    failure: IFormListFailure;
    /** Read the state again. */
    onRetry: () => void;
    /** Drop the list's parameters and show the whole list. */
    onShowAll: () => void;
    palette: IListPalette;
    text: TFormListText;
}

/**
 * The list's error state: the page is served, this list says why it cannot be
 * drawn. A bad link offers the whole list; a failed read offers a retry; a
 * missing sign-in only says so (the app's own login is the way in).
 */
export function FormListErrorState({ failure, onRetry, onShowAll, palette, text }: IFormListErrorStateProps): React.ReactElement {
    const canRetry = canRetryFailure(failure);
    const canShowAll = canShowAllFailure(failure) && failure.status !== 401;

    return (
        <View style={styles.section} testID={`form-list-error-${failure.reason}`}>
            <ListBanner tone="error" palette={palette}>{failureMessage(failure, text)}</ListBanner>
            {canRetry || canShowAll ? (
                <View style={styles.actions}>
                    {canRetry ? <ListButton label={text.retry} onPress={onRetry} palette={palette} testID="form-list-retry" /> : null}
                    {canShowAll ? <ListButton label={text.showAll} onPress={onShowAll} palette={palette} testID="form-list-show-all" /> : null}
                </View>
            ) : null}
        </View>
    );
}
