/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Shared sizing reader for the layout renderers. The cross-platform
 * `shared_width`/`shared_height` (and, for `center`, the min/max constraints)
 * are authored as CMS dimension strings ("320px", "50%", "auto"); React Native
 * cannot take a unit suffix, so every value flows through the shared mapper
 * `parseDimensionToReactNative` ("320px" -> 320, "50%" -> "50%", "auto" -> "auto").
 *
 * Returns a partial RN `ViewStyle`; an unset field is simply omitted so the
 * renderer keeps its own default.
 */
import type { ViewStyle } from 'react-native';
import { parseDimensionToReactNative } from '@selfhelp/shared';
import { readField } from '@/components/renderer/useField';

type TFieldHolder = { fields?: Record<string, unknown> } & object;

/** Read `shared_width` / `shared_height` into an RN style fragment. */
export function readSizingStyle(section: TFieldHolder): ViewStyle {
    const style: ViewStyle = {};
    const width = parseDimensionToReactNative(readField<string>(section, 'shared_width'));
    const height = parseDimensionToReactNative(readField<string>(section, 'shared_height'));
    if (width !== undefined) style.width = width;
    if (height !== undefined) style.height = height;
    return style;
}

/** `center` additionally supports the min/max width + height constraints. */
export function readConstraintStyle(section: TFieldHolder): ViewStyle {
    const style = readSizingStyle(section);
    const miw = parseDimensionToReactNative(readField<string>(section, 'shared_miw'));
    const mih = parseDimensionToReactNative(readField<string>(section, 'shared_mih'));
    const maw = parseDimensionToReactNative(readField<string>(section, 'shared_maw'));
    const mah = parseDimensionToReactNative(readField<string>(section, 'shared_mah'));
    if (miw !== undefined) style.minWidth = miw;
    if (mih !== undefined) style.minHeight = mih;
    if (maw !== undefined) style.maxWidth = maw;
    if (mah !== undefined) style.maxHeight = mah;
    return style;
}
