/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { StyleSheet } from 'react-native';

import type { IAppColors } from '@/hooks/useAppColors';

/** Smallest touch target: 44 points in each direction. */
export const MIN_TOUCH = 44;

export interface IListPalette extends IAppColors {
    /** Error text on the page background: darker than `danger`, which is a fill colour. */
    dangerText: string;
    dangerSurface: string;
    warningSurface: string;
    warningBorder: string;
    infoSurface: string;
    infoBorder: string;
}

/**
 * The colours of a list on top of the app palette. Banners keep the normal
 * text colour (contrast) and say what they are in words and a coloured edge:
 * colour never carries the meaning alone.
 */
export function listPalette(colors: IAppColors): IListPalette {
    return colors.isDark
        ? {
            ...colors,
            dangerText: '#ff8787',
            dangerSurface: '#3a1f22',
            warningSurface: '#3b2a12',
            warningBorder: '#f59f00',
            infoSurface: '#1b2733',
            infoBorder: '#4dabf7',
        }
        : {
            ...colors,
            dangerText: '#c92a2a',
            dangerSurface: '#fff5f5',
            warningSurface: '#fff4e6',
            warningBorder: '#e8590c',
            infoSurface: '#e7f5ff',
            infoBorder: '#228be6',
        };
}

export const styles = StyleSheet.create({
    root: { gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
    heading: { fontSize: 20, fontWeight: '700' },
    body: { gap: 12 },
    toolbar: { gap: 10 },
    toolbarRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
    searchBox: { flex: 1, minWidth: 180, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, minHeight: MIN_TOUCH, paddingLeft: 12 },
    searchInput: { flex: 1, minHeight: MIN_TOUCH - 2, fontSize: 16, paddingVertical: 6 },
    inputError: { fontSize: 13, marginTop: 2 },
    controlBlock: { gap: 4 },
    controlLabel: { fontSize: 13, fontWeight: '600' },
    controlInput: { borderWidth: 1, borderRadius: 8, minHeight: MIN_TOUCH, paddingHorizontal: 12, fontSize: 16, paddingVertical: 8 },
    controlPicker: { borderWidth: 1, borderRadius: 8, minHeight: MIN_TOUCH, paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center' },
    rangeRow: { flexDirection: 'row', gap: 8 },
    rangeCell: { flex: 1, gap: 4 },
    segmentRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
    button: { minHeight: MIN_TOUCH, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
    buttonText: { fontSize: 15, fontWeight: '600' },
    card: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 8 },
    cardBody: { gap: 6 },
    cardTitle: { fontSize: 16, fontWeight: '700' },
    cell: { gap: 2 },
    cellLabel: { fontSize: 12, fontWeight: '600' },
    cellValue: { fontSize: 15 },
    denseRow: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
    densePairs: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4 },
    densePair: { flexDirection: 'row', gap: 4, flexShrink: 1 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    badge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
    badgeText: { fontSize: 13, fontWeight: '600' },
    fileLink: { fontSize: 15, textDecorationLine: 'underline', minHeight: 24 },
    pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
    pagerText: { fontSize: 14 },
    banner: { borderWidth: 1, borderLeftWidth: 4, borderRadius: 8, padding: 12, gap: 6 },
    bannerTitle: { fontSize: 15, fontWeight: '700' },
    bannerText: { fontSize: 15 },
    emptyBox: { gap: 8, alignItems: 'flex-start', paddingVertical: 8 },
    loadingBox: { gap: 8, paddingVertical: 8 },
    skeleton: { height: 28, borderRadius: 6 },
    sheet: { flex: 1 },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
    sheetTitle: { flex: 1, fontSize: 18, fontWeight: '700' },
    sheetBody: { padding: 16, gap: 16, paddingBottom: 48 },
    pageHeader: { gap: 8 },
    pagePanel: { gap: 12 },
    panelTitle: { fontSize: 18, fontWeight: '700' },
    scrim: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    dialog: { width: '100%', maxWidth: 420, borderRadius: 12, padding: 20, gap: 14, maxHeight: '85%' },
    dialogTitle: { fontSize: 18, fontWeight: '700' },
    dialogActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
    tabs: { flexDirection: 'row', gap: 8 },
    detailLabel: { fontSize: 12, fontWeight: '600' },
    detailValue: { fontSize: 16 },
    section: { gap: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '700' },
    revision: { borderWidth: 1, borderRadius: 8, padding: 12, gap: 8 },
    revisionHead: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
    changeRow: { gap: 2, paddingVertical: 4 },
    pickBox: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
    pickMark: { width: 22, height: 22, borderWidth: 2, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
    optionRow: { minHeight: MIN_TOUCH, paddingVertical: 10, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
    announce: { height: 1, width: 1, overflow: 'hidden', position: 'absolute', opacity: 0 },
});
