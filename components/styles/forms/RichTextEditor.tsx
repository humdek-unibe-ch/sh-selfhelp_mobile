/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * RichTextEditor — functional editor for the `rich-text-editor` style on
 * mobile.
 *
 * Full WYSIWYG (TipTap-equivalent) on React Native is out of scope; per the
 * mobile rendering plan (11.6) the open-source fallback supports a DOCUMENTED
 * SUBSET while preserving submitted data and editing behaviour. Here that
 * subset is: the author edits the rich-text SOURCE (HTML/markdown markup) in a
 * multiline field, with a live rendered preview below. The exact submitted
 * string is preserved — we write back precisely what was typed — so no data is
 * lost on round-trip, and a richer editor can replace this later without a
 * data migration.
 */

import { useState } from 'react';
import { Text, TextInput, useWindowDimensions, View } from 'react-native';
import RenderHtml from 'react-native-render-html';

import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField, useInterpolatedField } from '@/components/renderer/useField';
import { useFieldBinding } from './_useFieldBinding';
import { FieldShell } from './_FieldShell';

export function RichTextEditor({ section, values }: IStyleProps): React.ReactElement {
    const { width } = useWindowDimensions();
    const name = readField<string>(section, 'name') ?? '';
    const label = useInterpolatedField(section, 'label', values);
    const description = useInterpolatedField(section, 'description', values);
    const placeholder = useInterpolatedField(section, 'placeholder', values);
    const required = readBooleanField(section, 'is_required', false);
    const disabled = readBooleanField(section, 'disabled', false);
    const initial = readField<string>(section, 'value') ?? '';
    const { value, error, setValue } = useFieldBinding(name, initial);

    const [showPreview, setShowPreview] = useState(true);
    const html = value || '<p></p>';

    return (
        <FieldShell label={label} description={description} required={required} error={error} className={buildSectionClasses(section)}>
            <TextInput
                value={value}
                onChangeText={setValue}
                placeholder={placeholder}
                editable={!disabled}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                accessibilityLabel={label || name}
                accessibilityState={{ disabled }}
                style={{
                    borderWidth: 1,
                    borderColor: error ? '#fa5252' : '#ced4da',
                    borderRadius: 6,
                    padding: 10,
                    minHeight: 110,
                    fontFamily: 'monospace',
                    opacity: disabled ? 0.55 : 1,
                }}
            />
            <Text
                onPress={() => setShowPreview((p) => !p)}
                accessibilityRole="button"
                style={{ color: '#228be6', fontSize: 12, marginTop: 6 }}
            >
                {showPreview ? 'Hide preview' : 'Show preview'}
            </Text>
            {showPreview ? (
                <View style={{ borderWidth: 1, borderColor: '#dee2e6', borderRadius: 6, padding: 10, marginTop: 6 }}>
                    <RenderHtml contentWidth={width - 24} source={{ html }} />
                </View>
            ) : null}
        </FieldShell>
    );
}
