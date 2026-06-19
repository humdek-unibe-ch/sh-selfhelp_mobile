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
import { FieldShell } from './_FieldShell';
import { validateFile } from './_fileValidation';

/**
 * FileInput — functional media picker built on `expo-image-picker`. It enforces
 * the CMS accept/size constraints (`web_file_input_accept`,
 * `web_file_input_max_size`) BEFORE the file is accepted for upload (mobile
 * rendering plan 11.6), then stores the picked asset URI as the field value.
 * (Generic non-image documents are a follow-up once `expo-document-picker` is
 * added; the validation contract is shared and already covers them.)
 */
export function FileInput({ section, values }: IStyleProps): React.ReactElement {
    const name = readField<string>(section, 'name') ?? '';
    const label = useInterpolatedField(section, 'label', values);
    const description = useInterpolatedField(section, 'description', values);
    const placeholder = useInterpolatedField(section, 'placeholder', values) || 'Choose a file…';
    const required = readBooleanField(section, 'is_required', false);
    const disabled = readBooleanField(section, 'disabled', false);
    const accept = readField<string>(section, 'web_file_input_accept');
    const maxSizeBytes = readNumberField(section, 'web_file_input_max_size');
    const { value, error, setValue } = useFieldBinding(name);

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
        setFileName(asset.fileName ?? asset.uri.split('/').pop() ?? 'file');
        setValue(asset.uri);
    }

    const shownName = fileName ?? (value ? value.split('/').pop() : '');

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
                    borderColor: localError ? '#fa5252' : '#adb5bd',
                    borderRadius: 6,
                    padding: 14,
                    opacity: disabled ? 0.55 : 1,
                }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: shownName ? '#212529' : '#868e96', flexShrink: 1 }} numberOfLines={1}>
                        {shownName || placeholder}
                    </Text>
                    {shownName ? (
                        <Pressable
                            onPress={() => {
                                setFileName(null);
                                setValue('');
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Remove file"
                            hitSlop={8}
                        >
                            <Text style={{ color: '#868e96', fontSize: 18 }}>{'\u00d7'}</Text>
                        </Pressable>
                    ) : null}
                </View>
            </Pressable>
        </FieldShell>
    );
}
