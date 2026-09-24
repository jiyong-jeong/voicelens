import { GoogleGenAI, type Part } from '@google/genai';
import { z } from 'zod';
import { config } from '../config.js';
import { DETECT_SYSTEM, PLAN_SYSTEM, TRANSCRIBE_PROMPT } from './prompts.js';
import { EditPlan, Region, RegionList } from './schema.js';
import type { LLMProvider, Media, PlanInput } from './types.js';

const inline = (m: Media): Part => ({ inlineData: { data: m.data, mimeType: m.mimeType } });

export function createGeminiProvider(): LLMProvider {
  const ai = new GoogleGenAI({ apiKey: config.gemini.apiKey });
  const { models } = config.gemini;

  async function json<T extends z.ZodType>(schema: T, system: string, parts: Part[]): Promise<z.infer<T>> {
    const res = await ai.models.generateContent({
      model: models.reasoning,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: system,
        responseMimeType: 'application/json',
        responseJsonSchema: z.toJSONSchema(schema),
      },
    });
    return schema.parse(JSON.parse(res.text ?? '{}'));
  }

  return {
    name: 'gemini',

    async transcribe(audio) {
      const res = await ai.models.generateContent({
        model: models.transcribe,
        contents: [{ role: 'user', parts: [inline(audio), { text: TRANSCRIBE_PROMPT }] }],
      });
      // 전용 transcribe 모델은 텍스트 대신 audioTranscription 파트로 결과를 돌려준다
      const parts = (res.candidates?.[0]?.content?.parts ?? []) as Array<Part & { audioTranscription?: { text?: string } }>;
      const text = parts.map((p) => p.audioTranscription?.text ?? p.text ?? '').join('');
      return text.trim();
    },

    async planCommand({ text, image, selectedRegion }: PlanInput) {
      const parts: Part[] = [];
      if (image) parts.push(inline(image));
      if (selectedRegion) parts.push({ text: `selectedRegion: ${JSON.stringify(selectedRegion)}` });
      parts.push({ text: `명령: ${text}` });
      return json(EditPlan, PLAN_SYSTEM, parts);
    },

    async detectRegions({ image, query }) {
      const out = await json(RegionList, DETECT_SYSTEM, [inline(image), { text: `찾을 대상: ${query}` }]);
      return out.regions;
    },

    async editImage({ image, instruction, region }) {
      const scope = region
        ? ` Only modify the area inside the bounding box [ymin,xmin,ymax,xmax]=${JSON.stringify(region.box)} (0-1000 normalized, "${region.label}"); keep everything else pixel-identical.`
        : ' Keep composition, subjects and framing unchanged.';
      const res = await ai.models.generateContent({
        model: models.imageEdit,
        contents: [{ role: 'user', parts: [inline(image), { text: instruction + scope }] }],
        config: { responseModalities: ['IMAGE', 'TEXT'] },
      });
      const img = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
      if (!img?.data) throw new Error(`이미지 편집 결과가 없습니다: ${res.text ?? 'no text'}`);
      return { data: img.data, mimeType: img.mimeType ?? 'image/png' };
    },
  };
}

export type { Region };
