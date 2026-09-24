import type { Adjustments } from './types';

/** Skia ColorMatrix 용 4x5 행렬(행 우선 20개). 평행이동 열은 0–1 정규화 값. */
export type Matrix = number[];

const IDENTITY: Matrix = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
const LR = 0.2126, LG = 0.7152, LB = 0.0722;

/** a ∘ b (b를 먼저 적용한 뒤 a) */
function concat(a: Matrix, b: Matrix): Matrix {
  const out = new Array(20).fill(0);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      let v = c === 4 ? a[r * 5 + 4] : 0;
      for (let k = 0; k < 4; k++) v += a[r * 5 + k] * b[k * 5 + c];
      out[r * 5 + c] = v;
    }
  }
  return out;
}

const scale = (s: number, t = 0): Matrix => [s, 0, 0, 0, t, 0, s, 0, 0, t, 0, 0, s, 0, t, 0, 0, 0, 1, 0];

function saturation(s: number): Matrix {
  const i = 1 - s;
  return [
    i * LR + s, i * LG, i * LB, 0, 0,
    i * LR, i * LG + s, i * LB, 0, 0,
    i * LR, i * LG, i * LB + s, 0, 0,
    0, 0, 0, 1, 0,
  ];
}

/**
 * 파라메트릭 보정 → 컬러 매트릭스.
 * 하이라이트/섀도는 톤 커브가 아닌 선형 근사다 (docs/ISSUES.md 참고: 추후 RuntimeShader로 교체).
 */
export function toMatrix(a: Adjustments): Matrix {
  let m = IDENTITY;
  if (a.exposure) m = concat(scale(Math.pow(2, a.exposure)), m);
  if (a.shadows) {
    const k = a.shadows / 100 * 0.12; // 어두운 영역 들어올리기: 오프셋 +, 기울기 -
    m = concat(scale(1 - k, k), m);
  }
  if (a.highlights) {
    const k = a.highlights / 100 * 0.15; // 밝은 영역: 기울기만 조정
    m = concat(scale(1 + k), m);
  }
  if (a.contrast) {
    const c = 1 + a.contrast / 100;
    m = concat(scale(c, 0.5 * (1 - c)), m);
  }
  if (a.saturation) m = concat(saturation(1 + a.saturation / 100), m);
  if (a.temperature || a.tint) {
    const t = (a.temperature ?? 0) / 100 * 0.1;
    const g = (a.tint ?? 0) / 100 * 0.08;
    m = concat([1, 0, 0, 0, t, 0, 1, 0, 0, -g, 0, 0, 1, 0, -t, 0, 0, 0, 1, 0], m);
  }
  return m;
}

const KEYS: (keyof Adjustments)[] = ['exposure', 'contrast', 'saturation', 'temperature', 'tint', 'highlights', 'shadows', 'vignette'];

export function mergeAdjustments(a: Adjustments = {}, b: Adjustments = {}): Adjustments {
  const out: Adjustments = {};
  for (const k of KEYS) {
    const v = (a[k] ?? 0) + (b[k] ?? 0);
    if (v) out[k] = v;
  }
  return out;
}

const LABELS: Record<keyof Adjustments, string> = {
  exposure: '노출', contrast: '대비', saturation: '채도', temperature: '색온도',
  tint: '틴트', highlights: '하이라이트', shadows: '그림자', vignette: '비네팅',
};

export function describe(a: Adjustments = {}): string {
  return KEYS.filter((k) => a[k])
    .map((k) => {
      const v = a[k]!;
      const n = k === 'exposure' ? v.toFixed(1) : Math.round(v).toString();
      return `${LABELS[k]} ${v > 0 ? '+' : '−'}${n.replace('-', '')}`;
    })
    .join(' · ');
}
