import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { Media } from './types';

/** API 전송·편집 기준 해상도. 토큰/지연 시간 절충값 (docs/ARCHITECTURE.md) */
export const WORKING_MAX = 1536;

export async function toWorkingImage(uri: string, w: number, h: number): Promise<{ media: Media; width: number; height: number }> {
  const ctx = ImageManipulator.manipulate(uri);
  if (Math.max(w, h) > WORKING_MAX) ctx.resize(w >= h ? { width: WORKING_MAX } : { height: WORKING_MAX });
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ base64: true, compress: 0.85, format: SaveFormat.JPEG });
  return { media: { data: out.base64!, mimeType: 'image/jpeg' }, width: out.width, height: out.height };
}
