/**
 * Thin wrapper over `expo-audio` for recording. The form-style audio
 * recorder uses this module so the UI and the hardware concerns stay
 * separated.
 */

import { useAudioRecorder, RecordingPresets } from 'expo-audio';

export type TAudioRecorderHandle = ReturnType<typeof useAudioRecorder>;

export function useDefaultAudioRecorder(): TAudioRecorderHandle {
    return useAudioRecorder(RecordingPresets.HIGH_QUALITY);
}
