import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { File } from 'expo-file-system';
import { useCallback } from 'react';
import type { Media } from '@/lib/types';

/** 탭 토글 방식 녹음. stop()이 base64 오디오(m4a/AAC)를 돌려준다. */
export function useVoiceRecorder() {
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const state = useAudioRecorderState(recorder, 100);

  const start = useCallback(async () => {
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) throw new Error('마이크 권한이 필요해요');
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  }, [recorder]);

  const stop = useCallback(async (): Promise<Media | null> => {
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });
    if (!recorder.uri) return null;
    const data = await new File(recorder.uri).base64();
    return { data, mimeType: 'audio/mp4' };
  }, [recorder]);

  return {
    recording: state.isRecording,
    durationMs: state.durationMillis,
    /** dBFS (-160~0). 파형 표시에 사용 */
    level: state.metering ?? -160,
    start,
    stop,
  };
}
