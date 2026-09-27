import { Platform } from 'react-native';
import type { EditPlan, Media, Region } from './types';

/**
 * 서버 주소.
 * - 웹: 페이지를 연 호스트 그대로 + :8787 (localhost / LAN IP 가 바뀌어도 자동으로 맞음).
 *   운영처럼 다른 도메인을 쓰면 EXPO_PUBLIC_WEB_API_URL 로 지정.
 * - 네이티브: EXPO_PUBLIC_API_URL (실기기는 Mac 의 LAN IP)
 */
const BASE =
  Platform.OS === 'web'
    ? process.env.EXPO_PUBLIC_WEB_API_URL ?? `${window.location.protocol}//${window.location.hostname}:8787`
    : process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787';
const TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN ?? '';

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-app-token': TOKEN },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(`서버에 연결할 수 없어요 (${BASE}). 서버 실행 여부와 주소를 확인하세요`);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `요청 실패 (${res.status})`);
  return json as T;
}

export const api = {
  transcribe: (audio: Media) => post<{ text: string }>('/api/transcribe', { audio }),
  plan: (text: string, image?: Media, selectedRegion?: Region) =>
    post<EditPlan>('/api/plan', { text, image, selectedRegion }),
  voiceCommand: (audio: Media, image?: Media, selectedRegion?: Region) =>
    post<{ text: string; plan: EditPlan | null }>('/api/voice-command', { audio, image, selectedRegion }),
  detect: (image: Media, query: string) => post<{ regions: Region[] }>('/api/detect', { image, query }),
  edit: (image: Media, instruction: string, region?: Region) =>
    post<{ image: Media }>('/api/edit', { image, instruction, region }),
};
