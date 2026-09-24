import type { EditPlan, Media, Region } from './types';

const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787';
const TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN ?? '';

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-app-token': TOKEN },
    body: JSON.stringify(body),
  });
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
