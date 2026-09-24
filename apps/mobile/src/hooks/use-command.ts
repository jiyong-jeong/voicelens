import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import type { EditPlan, Media } from '@/lib/types';
import { useSession } from '@/state/session';
import { useVoiceRecorder } from './use-voice-recorder';

type Phase = 'idle' | 'listening' | 'thinking' | 'editing' | 'done' | 'error';

interface Handlers {
  onCapture?: () => void;
  onSave?: () => void;
}

/**
 * 음성/텍스트 명령 파이프라인:
 * 녹음 → /api/voice-command (받아쓰기 + 계획) → intent 별 실행
 * (파라메트릭은 디바이스에서 즉시, 생성형은 /api/edit)
 */
export function useCommand(handlers: Handlers = {}) {
  const session = useSession();
  const voice = useVoiceRecorder();
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [plan, setPlan] = useState<EditPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const image: Media | undefined = session.current?.base;

  const execute = useCallback(
    async (said: string, p: EditPlan) => {
      setPlan(p);
      switch (p.intent) {
        case 'capture':
          handlers.onCapture?.();
          break;
        case 'save':
          handlers.onSave?.();
          break;
        case 'undo':
          session.undo();
          break;
        case 'reset':
          session.reset();
          break;
        case 'select':
          if (p.regions[0]) session.setSelected(p.regions[0]);
          break;
        case 'generative': {
          const op = p.operations.find((o) => o.generativePrompt);
          if (!op?.generativePrompt || !image) break;
          setPhase('editing');
          const region = p.regions.find((r) => r.label === op.regionLabel) ?? session.selected ?? undefined;
          const { image: edited } = await api.edit(image, op.generativePrompt, region);
          session.replaceBase(said, edited, p.reply);
          break;
        }
        case 'adjust':
          session.applyPlan(said, p);
          break;
      }
      setPhase('done');
    },
    [handlers, image, session],
  );

  const run = useCallback(
    async (task: () => Promise<{ text: string; plan: EditPlan | null }>) => {
      setError(null);
      setPhase('thinking');
      try {
        const { text, plan: p } = await task();
        setTranscript(text);
        if (!p) {
          setPhase('idle');
          return;
        }
        await execute(text, p);
      } catch (e) {
        setError((e as Error).message);
        setPhase('error');
      }
    },
    [execute],
  );

  const toggleListening = useCallback(async () => {
    if (!voice.recording) {
      setTranscript('');
      setPlan(null);
      setError(null);
      try {
        await voice.start();
        setPhase('listening');
      } catch (e) {
        setError((e as Error).message);
        setPhase('error');
      }
      return;
    }
    const audio = await voice.stop();
    if (!audio) return setPhase('idle');
    await run(() => api.voiceCommand(audio, image, session.selected ?? undefined));
  }, [voice, run, image, session.selected]);

  /** 키보드 입력 대체 경로 (소음 환경, 접근성) */
  const submitText = useCallback(
    (text: string) => run(async () => ({ text, plan: await api.plan(text, image, session.selected ?? undefined) })),
    [run, image, session.selected],
  );

  return { phase, transcript, plan, error, voice, toggleListening, submitText };
}
