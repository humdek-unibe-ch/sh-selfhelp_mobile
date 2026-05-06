/**
 * Centralised permission helpers for camera, microphone, and media-library.
 * Each helper checks current state and only prompts when needed.
 *
 * Style components (camera, audio, file-input) call these on first
 * activation rather than on mount, so the user sees a contextual prompt.
 */

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

export async function ensureMicrophonePermission(): Promise<TPermissionResult> {
    const current = await Camera.getMicrophonePermissionsAsync();
    if (current.granted) return { granted: true, canAskAgain: current.canAskAgain };
    const next = await Camera.requestMicrophonePermissionsAsync();
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
