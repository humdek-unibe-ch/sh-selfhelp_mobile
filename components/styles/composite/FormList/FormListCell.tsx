/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { IFormListColumn, TFormListCellValue } from '@selfhelp/shared';

import { useAssetSource } from '@/components/renderer/useAssetSource';
import { styles, type IListPalette } from './FormList.styles';
import { formatListCell, isFileCell, type TFormListText } from './FormList.logic';

interface IFormListCellProps {
    value: TFormListCellValue | undefined;
    column: IFormListColumn;
    palette: IListPalette;
    text: TFormListText;
}

/**
 * One cell, drawn from what the server sent: text, a badge, a number, a date,
 * an image thumbnail, or the names of the files of a file column. A file
 * download needs the visitor's session (system browser has none), so file
 * columns name the files; image columns load through {@link useAssetSource}.
 */
export function FormListCell({ value, column, palette, text }: IFormListCellProps): React.ReactElement {
    if (isFileCell(value)) {
        const files = value.files;
        if (files.length === 0) {
            return <EmptyCell palette={palette} text={text} />;
        }
        if (column.format === 'image') {
            return <ImageThumb url={files[0].url} name={files[0].name} />;
        }
        return (
            <View style={{ gap: 2 }}>
                {files.map((file) => (
                    <Text key={file.index} style={[styles.cellValue, { color: palette.text }]} accessibilityLabel={`File ${file.name}`}>
                        {file.name}
                    </Text>
                ))}
            </View>
        );
    }

    const content = formatListCell(value, column.format);
    if (content === '') {
        return <EmptyCell palette={palette} text={text} />;
    }
    if (column.format === 'badge') {
        return (
            <View style={[styles.badge, { borderColor: palette.border, backgroundColor: palette.surfaceMuted }]}>
                <Text style={[styles.badgeText, { color: palette.text }]}>{content}</Text>
            </View>
        );
    }
    return <Text style={[styles.cellValue, { color: palette.text }]}>{content}</Text>;
}

function ImageThumb({ url, name }: { url: string; name: string }): React.ReactElement {
    const source = useAssetSource(url);
    if (!source) {
        return <Text accessibilityLabel={`Image ${name}`}>{name}</Text>;
    }
    return (
        <Image
            accessibilityLabel={name}
            source={source}
            contentFit="cover"
            cachePolicy="memory-disk"
            style={{ width: 72, height: 40, borderRadius: 4 }}
        />
    );
}

function EmptyCell({ palette, text }: { palette: IListPalette; text: TFormListText }): React.ReactElement {
    return (
        <Text accessibilityLabel={text.emptyCell} style={[styles.cellValue, { color: palette.textMuted }]}>
            {'\u2014'}
        </Text>
    );
}
