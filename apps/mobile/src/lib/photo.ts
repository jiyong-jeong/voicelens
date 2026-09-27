import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { Media } from './types';

/** API 전송·편집 기준 해상도. 토큰/지연 시간 절충값 (docs/ARCHITECTURE.md) */
export const WORKING_MAX = 1536;

export async function toWorkingImage(uri: string, w: number, h: number): Promise<{ media: Media; width: number; height: number }> {
  const ctx = ImageManipulator.manipulate(uri);
  if (Math.max(w, h) > WORKING_MAX) ctx.resize(w >= h ? { width: WORKING_MAX } : { height: WORKING_MAX });
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ base64: true, compress: 0.85, format: SaveFormat.JPEG });
  // 웹에서는 base64 가 비고 uri 가 data URI 로 오는 경우가 있다
  const data = out.base64 ?? out.uri.slice(out.uri.indexOf(',') + 1);
  return { media: { data, mimeType: 'image/jpeg' }, width: out.width, height: out.height };
}
