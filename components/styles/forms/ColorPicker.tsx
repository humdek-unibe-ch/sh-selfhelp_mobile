/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { ColorInput } from './ColorInput';
import type { IStyleProps } from '@/components/renderer/types';

/** Mantine ColorPicker is a UI grid; v1 mobile reuses ColorInput. */
export function ColorPicker(props: IStyleProps): React.ReactElement {
    return <ColorInput {...props} />;
}
