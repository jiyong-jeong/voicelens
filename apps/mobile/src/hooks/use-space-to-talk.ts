import { useIsFocused } from 'expo-router';
import { useEffect, useRef } from 'react';
import { isWeb } from '@/lib/layout';

/**
 * 웹: Space 로 녹음 시작/종료.
 * - 스택 아래에 깔린(보이지 않는) 화면도 마운트 상태로 남아 있으므로, 반드시 포커스된 화면에서만 듣는다.
 *   (그렇지 않으면 촬영·편집 화면이 동시에 녹음해 명령이 두 번 적용된다)
 * - 입력창·버튼에 포커스가 있으면 무시한다 (버튼은 Space 로 자체 클릭되므로 중복 방지).
 */
export function useSpaceToTalk(toggle: () => void, enabled = true) {
  const focused = useIsFocused();
  const ref = useRef(toggle);
  ref.current = toggle;
  const active = isWeb && enabled && focused;
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(el.tagName) || el.closest('[role="button"],[role="tab"]'))) return;
      e.preventDefault();
      ref.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);
}
