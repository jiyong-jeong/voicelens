import { z } from 'zod';

/** 정규화 좌표(0–1000) 바운딩 박스: [ymin, xmin, ymax, xmax] — Gemini 네이티브 포맷 */
export const Box = z.tuple([z.number(), z.number(), z.number(), z.number()]);

export const Region = z.object({
  label: z.string().describe('영역 이름 (한국어, 예: 하늘, 인물, 왼쪽 나무)'),
  box: Box.describe('[ymin, xmin, ymax, xmax], 0–1000 정규화 좌표'),
});
export type Region = z.infer<typeof Region>;

/** 디바이스에서 실시간으로 적용 가능한 파라메트릭 보정값 (0 = 변화 없음) */
export const Adjustments = z.object({
  exposure: z.number().min(-2).max(2).optional().describe('노출 EV'),
  contrast: z.number().min(-100).max(100).optional(),
  saturation: z.number().min(-100).max(100).optional(),
  temperature: z.number().min(-100).max(100).optional().describe('음수=차갑게(파랑), 양수=따뜻하게(주황)'),
  tint: z.number().min(-100).max(100).optional().describe('음수=초록, 양수=마젠타'),
  highlights: z.number().min(-100).max(100).optional(),
  shadows: z.number().min(-100).max(100).optional(),
  vignette: z.number().min(0).max(100).optional(),
});
export type Adjustments = z.infer<typeof Adjustments>;

export const Operation = z.object({
  target: z.enum(['global', 'region']),
  regionLabel: z.string().optional().describe('target=region 일 때 regions[].label 과 일치'),
  adjustments: Adjustments.optional(),
  generativePrompt: z
    .string()
    .optional()
    .describe('파라메트릭 보정으로 불가능한 요청(객체 제거, 스타일 변경 등)일 때만: 이미지 편집 모델에 보낼 영어 지시문'),
});
export type Operation = z.infer<typeof Operation>;

export const EditPlan = z.object({
  intent: z.enum(['capture', 'adjust', 'select', 'generative', 'undo', 'reset', 'save', 'unknown']),
  reply: z.string().describe('사용자에게 보여줄 한 문장 한국어 피드백'),
  regions: z.array(Region).describe('명령에 언급된 영역들 (없으면 빈 배열)'),
  operations: z.array(Operation),
});
export type EditPlan = z.infer<typeof EditPlan>;

export const RegionList = z.object({ regions: z.array(Region) });
