/*
SPDX-FileCopyrightText: 2026 Humdek, University of Bern
SPDX-License-Identifier: MPL-2.0
*/
/**
 * Centralised permission helpers for camera, microphone, and media-library.
 * Each helper checks current state and only prompts when needed.
 *
 * Style components (camera, audio, file-input) call these on first
 * activation rather than on mount, so the user sees a contextual prompt.
 */

import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';

type TPermissionResult = { granted: boolean; canAskAgain: boolean };

export async function ensureCameraPermission(): Promise<TPermissionResult> {
    const current = await Camera.getCameraPermissionsAsync();
    if (current.granted) return { granted: true, canAskAgain: current.canAskAgain };
    const next = await Camera.requestCameraPermissionsAsync();
    return { granted: next.granted, canAskAgain: next.canAskAgain };
}

/**
 * Microphone access through `expo-audio`, the library a recording uses. The
 * plugin host (`services/pluginHostServices.ts`) asks through this helper and
 * maps `granted` / `canAskAgain` to `granted`, `denied` or `blocked`
 * (`mapPermissionAnswer`), so it needs no audio or camera library of its own.
 */
export async function ensureMicrophonePermission(): Promise<TPermissionResult> {
    const current = await getRecordingPermissionsAsync();
    if (current.granted) return { granted: true, canAskAgain: current.canAskAgain };
    const next = await requestRecordingPermissionsAsync();
    return { granted: next.granted, canAskAgain: next.canAskAgain };
}

export async function ensureMediaLibraryPermission(): Promise<TPermissionResult> {
    const current = await MediaLibrary.getPermissionsAsync();
    if (current.granted) return { granted: true, canAskAgain: current.canAskAgain };
    const next = await MediaLibrary.requestPermissionsAsync();
    return { granted: next.granted, canAskAgain: next.canAskAgain };
}

export async function ensureImagePickerPermission(): Promise<TPermissionResult> {
    const current = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (current.granted) return { granted: true, canAskAgain: current.canAskAgain };
    const next = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return { granted: next.granted, canAskAgain: next.canAskAgain };
}
