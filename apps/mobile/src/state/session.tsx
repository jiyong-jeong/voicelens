import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { mergeAdjustments } from '@/lib/color-matrix';
import type { Adjustments, EditPlan, Media, Region } from '@/lib/types';

export interface RegionEdit {
  region: Region;
  adjustments: Adjustments;
}

/** 편집 상태 한 스냅샷 — undo 스택의 단위 */
export interface EditState {
  /** 현재 기준 이미지 (원본 또는 생성형 편집 결과) */
  base: Media;
  width: number;
  height: number;
  global: Adjustments;
  regions: RegionEdit[];
}

export interface HistoryEntry {
  said: string;
  summary: string;
}

interface Session {
  original: EditState | null;
  current: EditState | null;
  history: HistoryEntry[];
  /** 사용자가 영역 선택 화면에서 지정한 영역 — 다음 명령의 기본 대상 */
  selected: Region | null;
  start(photo: Media, width: number, height: number): void;
  applyPlan(said: string, plan: EditPlan): void;
  replaceBase(said: string, image: Media, summary: string): void;
  setSelected(r: Region | null): void;
  undo(): void;
  reset(): void;
}

const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<EditState[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selected, setSelected] = useState<Region | null>(null);

  const push = useCallback((next: EditState, entry: HistoryEntry) => {
    setStack((s) => [...s, next]);
    setHistory((h) => [...h, entry]);
  }, []);

  const current = stack.at(-1) ?? null;

  const applyPlan = useCallback(
    (said: string, plan: EditPlan) => {
      if (!current) return;
      let global = current.global;
      const regions = [...current.regions];
      for (const op of plan.operations) {
        if (!op.adjustments) continue;
        if (op.target === 'global') {
          global = mergeAdjustments(global, op.adjustments);
          continue;
        }
        const region =
          plan.regions.find((r) => r.label === op.regionLabel) ??
          (selected && (!op.regionLabel || op.regionLabel === selected.label) ? selected : undefined);
        if (!region) continue;
        const i = regions.findIndex((r) => r.region.label === region.label);
        if (i >= 0) regions[i] = { region, adjustments: mergeAdjustments(regions[i].adjustments, op.adjustments) };
        else regions.push({ region, adjustments: op.adjustments });
      }
      push({ ...current, global, regions }, { said, summary: plan.reply });
    },
    [current, selected, push],
  );

  const value = useMemo<Session>(
    () => ({
      original: stack[0] ?? null,
      current,
      history,
      selected,
      start(base, width, height) {
        setStack([{ base, width, height, global: {}, regions: [] }]);
        setHistory([]);
        setSelected(null);
      },
      applyPlan,
      replaceBase(said, image, summary) {
        if (current) push({ ...current, base: image }, { said, summary });
      },
      setSelected,
      undo() {
        setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
        setHistory((h) => h.slice(0, -1));
      },
      reset() {
        setStack((s) => s.slice(0, 1));
        setHistory([]);
      },
    }),
    [stack, current, history, selected, applyPlan, push],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const s = useContext(Ctx);
  if (!s) throw new Error('SessionProvider 밖에서 useSession 호출');
  return s;
}
