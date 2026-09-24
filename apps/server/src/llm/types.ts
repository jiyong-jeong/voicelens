import type { EditPlan, Region } from './schema.js';

export interface Media {
  /** base64 (data: 접두사 없이) */
  data: string;
  mimeType: string;
}

export interface PlanInput {
  text: string;
  image?: Media;
  /** 사용자가 손으로 지정한 영역이 있으면 그 영역 기준으로 해석 */
  selectedRegion?: Region;
}

/**
 * LLM 공급자 추상화. Gemini 외 공급자(Claude, OpenAI 등)를 추가할 때
 * 이 인터페이스만 구현하고 llm/index.ts 레지스트리에 등록하면 된다.
 */
export interface LLMProvider {
  readonly name: string;
  transcribe(audio: Media, opts?: { language?: string }): Promise<string>;
  planCommand(input: PlanInput): Promise<EditPlan>;
  detectRegions(input: { image: Media; query: string }): Promise<Region[]>;
  editImage(input: { image: Media; instruction: string; region?: Region }): Promise<Media>;
}
