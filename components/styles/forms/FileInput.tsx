/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { IStyleProps } from '@/components/renderer/types';
import { buildSectionClasses } from '@/styles/sectionClasses';
import { readField, readBooleanField, readNumberField, useInterpolatedField } from '@/components/renderer/useField';
import { useFieldBinding } from './_useFieldBinding';
import { useFormContextSafe } from './FormContext';
import { FieldShell } from './_FieldShell';
import { validateFile } from './_fileValidation';
import { useAppColors } from '@/hooks/useAppColors';

/**
 * FileInput — functional media picker built on `expo-image-picker`. It enforces
 * the CMS accept/size constraints (`web_file_input_accept`,
 * `web_file_input_max_size`) BEFORE the file is accepted for upload (mobile
 * rendering plan 11.6), then stores the picked asset URI as the field value.
 * (Generic non-image documents are a follow-up once `expo-document-picker` is
 * added; the validation contract is shared and already covers them.)
 *
 * The picked file is also handed to the surrounding form (`setFile`), which
 * uploads it with the save as a multipart file part; the field value alone
 * (the local URI) is never sent as text.
 */
export function FileInput({ section, values }: IStyleProps): React.ReactElement {
    const colors = useAppColors();
    const name = readField<string>(section, 'name') ?? '';
    const label = useInterpolatedField(section, 'label', values);
    const description = useInterpolatedField(section, 'description', values);
    const placeholder = useInterpolatedField(section, 'placeholder', values) || 'Choose a file…';
    const required = readBooleanField(section, 'is_required', false);
    const disabled = readBooleanField(section, 'disabled', false);
    const accept = readField<string>(section, 'web_file_input_accept');
    const maxSizeBytes = readNumberField(section, 'web_file_input_max_size');
    const { value, error, setValue } = useFieldBinding(name, '', { sendDefault: false });
    const form = useFormContextSafe();

    const [fileName, setFileName] = useState<string | null>(null);
    const [localError, setLocalError] = useState<string | null>(null);

    async function pick(): Promise<void> {
        setLocalError(null);
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            setLocalError('Permission to access files was denied.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({ quality: 1 });
        if (result.canceled || result.assets.length === 0) {
            return;
        }
        const asset = result.assets[0];
        const check = validateFile(
            { name: asset.fileName ?? undefined, size: asset.fileSize, mimeType: asset.mimeType },
            { accept, maxSizeBytes },
        );
        if (!check.ok) {
            setLocalError(check.error ?? 'This file is not allowed.');
            return;
        }
        const pickedName = asset.fileName ?? asset.uri.split('/').pop() ?? 'file';
        setFileName(pickedName);
        setValue(asset.uri);
        form?.setFile(name, {
            uri: asset.uri,
            name: pickedName,
            mimeType: asset.mimeType ?? undefined,
            size: asset.fileSize ?? undefined,
        });
    }

    const shownName = fileName ?? (value ? value.split('/').pop() : '');
    const showingStored = !fileName && !!shownName;

    return (
        <FieldShell
            label={label}
            description={description}
            required={required}
            error={error ?? localError ?? undefined}
            className={buildSectionClasses(section)}
        >
            <Pressable
                onPress={disabled ? undefined : pick}
                accessibilityRole="button"
                accessibilityLabel={label || placeholder}
                accessibilityState={{ disabled }}
                style={{
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: localError ? colors.danger : colors.border,
                    borderRadius: 6,
                    padding: 14,
                    backgroundColor: colors.surface,
                    opacity: disabled ? 0.55 : 1,
                }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: shownName ? colors.text : colors.textFaint, flexShrink: 1 }} numberOfLines={1}>
                        {showingStored ? `Current: ${shownName} (tap to replace)` : shownName || placeholder}
                    </Text>
                    {shownName ? (
                        <Pressable
                            onPress={() => {
                                setFileName(null);
                                setValue('');
                                form?.setFile(name, null);
                                // Explicit clear of a stored file on update (contract 4).
                                form?.setValue(name, JSON.stringify({ remove: true }));
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Remove file"
                            hitSlop={8}
                        >
                            <Text style={{ color: colors.textFaint, fontSize: 18 }}>{'\u00d7'}</Text>
                        </Pressable>
                    ) : null}
                </View>
            </Pressable>
        </FieldShell>
    );
}
