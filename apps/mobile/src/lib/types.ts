/**
 * apps/server/src/llm/schema.ts 의 타입 미러.
 * 서버 스키마를 바꾸면 여기도 같이 바꿀 것 (docs/ISSUES.md: 공유 패키지화 예정)
 */
export type Box = [ymin: number, xmin: number, ymax: number, xmax: number]; // 0–1000

export interface Region {
  label: string;
  box: Box;
}

export interface Adjustments {
  exposure?: number;
  contrast?: number;
  saturation?: number;
  temperature?: number;
  tint?: number;
  highlights?: number;
  shadows?: number;
  vignette?: number;
}

export interface Operation {
  target: 'global' | 'region';
  regionLabel?: string;
  adjustments?: Adjustments;
  generativePrompt?: string;
}

export type Intent = 'capture' | 'adjust' | 'select' | 'generative' | 'undo' | 'reset' | 'save' | 'unknown';

export interface EditPlan {
  intent: Intent;
  reply: string;
  regions: Region[];
  operations: Operation[];
}

export interface Media {
  data: string;
  mimeType: string;
}
