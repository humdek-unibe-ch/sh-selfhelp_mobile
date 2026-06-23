/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * RichTextEditor — functional editor for the `rich-text-editor` style on
 * mobile.
 *
 * A full TipTap-style WYSIWYG (the web editor) is not practical on React Native
 * without a WebView, so this is a lightweight, fully native toolbar editor:
 * the author selects text and taps Bold / Italic / Underline / Link, which wraps
 * the selection in the SAME safe inline subset (`<strong>`/`<em>`/`<u>`/`<a>`)
 * that `parseInlineRich` + `InlineText` render everywhere else. A live preview
 * shows exactly how the content will appear, and the raw value stays editable
 * (e.g. to fix a link URL). The exact submitted string is preserved, so the
 * value round-trips with the web TipTap editor's HTML without a data migration.
 *
 * Everything is themed through `useAppColors`, so the field, toolbar and preview
 * read correctly in dark mode.
 */

import { useMemo, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View, type NativeSyntheticEvent, type TextInputSelectionChangeEventData } from 'react-native';

import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField, useInterpolatedField } from '@/components/renderer/useField';
import { parseInlineRich } from '@/components/renderer/sanitizeContent';
import { InlineText } from '@/components/renderer/InlineText';
import { useAppColors } from '@/hooks/useAppColors';
import { useFieldBinding } from './_useFieldBinding';
import { FieldShell } from './_FieldShell';
import { applyInlineFormat, type TInlineFormat } from './richTextMarkup';

interface IToolbarButton {
    format: TInlineFormat;
    label: string;
    a11y: string;
    fontWeight?: 'bold' | 'normal';
    fontStyle?: 'italic' | 'normal';
    underline?: boolean;
}

const TOOLBAR: IToolbarButton[] = [
    { format: 'bold', label: 'B', a11y: 'Bold', fontWeight: 'bold' },
    { format: 'italic', label: 'I', a11y: 'Italic', fontStyle: 'italic' },
    { format: 'underline', label: 'U', a11y: 'Underline', underline: true },
    { format: 'link', label: 'Link', a11y: 'Insert link' },
];

export function RichTextEditor({ section, values }: IStyleProps): React.ReactElement {
    const colors = useAppColors();
    const name = readField<string>(section, 'name') ?? '';
    const label = useInterpolatedField(section, 'label', values);
    const description = useInterpolatedField(section, 'description', values);
    const placeholder = useInterpolatedField(section, 'placeholder', values);
    const required = readBooleanField(section, 'is_required', false);
    const disabled = readBooleanField(section, 'disabled', false);
    const initial = readField<string>(section, 'value') ?? '';
    const { value, error, setValue } = useFieldBinding(name, initial);

    const inputRef = useRef<TextInput>(null);
    const selection = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
    const [showPreview, setShowPreview] = useState(true);

    const previewNodes = useMemo(() => parseInlineRich(value), [value]);

    const onSelectionChange = (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>): void => {
        selection.current = e.nativeEvent.selection;
    };

    const applyFormat = (format: TInlineFormat): void => {
        if (disabled) return;
        const { start, end } = selection.current;
        const edit = applyInlineFormat(value, start, end, format);
        setValue(edit.text);
        selection.current = { start: edit.selectionStart, end: edit.selectionEnd };
        inputRef.current?.focus();
    };

    return (
        <FieldShell label={label} description={description} required={required} error={error} className={buildSectionClasses(section)}>
            <View
                style={{
                    flexDirection: 'row',
                    gap: 6,
                    marginBottom: 6,
                    opacity: disabled ? 0.55 : 1,
                }}
            >
                {TOOLBAR.map((btn) => (
                    <Pressable
                        key={btn.format}
                        onPress={() => applyFormat(btn.format)}
                        disabled={disabled}
                        accessibilityRole="button"
                        accessibilityLabel={btn.a11y}
                        accessibilityState={{ disabled }}
                        style={({ pressed }) => ({
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: pressed ? colors.pressed : colors.surfaceMuted,
                        })}
                    >
                        <Text
                            style={{
                                color: colors.text,
                                fontSize: 14,
                                fontWeight: btn.fontWeight ?? '600',
                                fontStyle: btn.fontStyle ?? 'normal',
                                textDecorationLine: btn.underline ? 'underline' : 'none',
                            }}
                        >
                            {btn.label}
                        </Text>
                    </Pressable>
                ))}
            </View>

            <TextInput
                ref={inputRef}
                value={value}
                onChangeText={setValue}
                onSelectionChange={onSelectionChange}
                placeholder={placeholder}
                placeholderTextColor={colors.textFaint}
                editable={!disabled}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                accessibilityLabel={label || name}
                accessibilityState={{ disabled }}
                style={{
                    borderWidth: 1,
                    borderColor: error ? colors.danger : colors.border,
                    borderRadius: 6,
                    padding: 10,
                    minHeight: 110,
                    fontFamily: 'monospace',
                    color: colors.text,
                    backgroundColor: colors.surface,
                    opacity: disabled ? 0.55 : 1,
                }}
            />

            <Text
                onPress={() => setShowPreview((p) => !p)}
                accessibilityRole="button"
                style={{ color: colors.primary, fontSize: 12, marginTop: 6 }}
            >
                {showPreview ? 'Hide preview' : 'Show preview'}
            </Text>
            {showPreview ? (
                <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 10, marginTop: 6, backgroundColor: colors.surfaceMuted }}>
                    {previewNodes.length > 0 ? (
                        <InlineText nodes={previewNodes} linkColor={colors.primary} style={{ color: colors.text }} />
                    ) : (
                        <Text style={{ color: colors.textFaint, fontStyle: 'italic' }}>Nothing to preview yet.</Text>
                    )}
                </View>
            ) : null}
        </FieldShell>
    );
}
