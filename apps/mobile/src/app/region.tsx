import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type GestureResponderEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fitRect, PhotoCanvas } from '@/components/photo-canvas';
import { Button, Header, IconButton } from '@/components/ui';
import { useCommand } from '@/hooks/use-command';
import { api } from '@/lib/api';
import type { Region } from '@/lib/types';
import { useSession } from '@/state/session';
import { colors, radius } from '@/theme/tokens';

type Tool = 'ai' | 'rect';

/** 03 영역 선택 — 말/텍스트로 AI 감지, 또는 손가락으로 사각형 지정 */
export default function RegionScreen() {
  const session = useSession();
  const cmd = useCommand();
  const [tool, setTool] = useState<Tool>('ai');
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<Region[]>([]);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const state = session.current;
  if (!state) return null;
  const fit = fitRect(state.width, state.height, box.w, box.h);

  async function detect() {
    if (!query.trim() || !state) return;
    setBusy(true);
    try {
      const { regions } = await api.detect(state.base, query.trim());
      setFound(regions);
      if (regions[0]) session.setSelected(regions[0]);
    } finally {
      setBusy(false);
    }
  }

  // 사각형 도구: 드래그 좌표 → 0–1000 정규화 박스
  const norm = (x: number, y: number) => [
    Math.round(Math.min(1000, Math.max(0, ((y - fit.y) / fit.height) * 1000))),
    Math.round(Math.min(1000, Math.max(0, ((x - fit.x) / fit.width) * 1000))),
  ];
  const touch = tool === 'rect' && {
    onStartShouldSetResponder: () => true,
    onResponderGrant: (e: GestureResponderEvent) => {
      const { locationX: x, locationY: y } = e.nativeEvent;
      setDrag({ x0: x, y0: y, x1: x, y1: y });
    },
    onResponderMove: (e: GestureResponderEvent) =>
      setDrag((d) => d && { ...d, x1: e.nativeEvent.locationX, y1: e.nativeEvent.locationY }),
    onResponderRelease: () => {
      if (!drag) return;
      const [ya, xa] = norm(drag.x0, drag.y0);
      const [yb, xb] = norm(drag.x1, drag.y1);
      if (Math.abs(xb - xa) > 20 && Math.abs(yb - ya) > 20) {
        session.setSelected({ label: '직접 선택', box: [Math.min(ya, yb), Math.min(xa, xb), Math.max(ya, yb), Math.max(xa, xb)] });
      }
      setDrag(null);
    },
  };

  const outlines = [...found, ...(session.selected && !found.includes(session.selected) ? [session.selected] : [])];

  return (
    <SafeAreaView style={s.root}>
      <Header
        left={<IconButton icon="back" label="뒤로" onPress={() => router.back()} />}
        title="영역 선택"
        right={session.selected ? <IconButton icon="close" label="선택 해제" onPress={() => session.setSelected(null)} /> : undefined}
      />
      <View style={s.stage} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} {...(touch || {})}>
        {box.w > 0 && <PhotoCanvas state={state} width={box.w} height={box.h} outlines={outlines} highlight={session.selected} />}
        {drag && (
          <View
            pointerEvents="none"
            style={[s.drag, { left: Math.min(drag.x0, drag.x1), top: Math.min(drag.y0, drag.y1), width: Math.abs(drag.x1 - drag.x0), height: Math.abs(drag.y1 - drag.y0) }]}
          />
        )}
      </View>

      <View style={s.tools}>
        {(['ai', 'rect'] as const).map((t) => (
          <Button key={t} variant={tool === t ? 'light' : 'outline'} onPress={() => setTool(t)}>
            {t === 'ai' ? 'AI 자동 선택' : '사각형'}
          </Button>
        ))}
      </View>

      <View style={s.bottom}>
        {tool === 'ai' ? (
          <>
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={detect}
              placeholder="무엇을 선택할까요? 예: 왼쪽 나무"
              placeholderTextColor={colors.muted}
              style={s.input}
              accessibilityLabel="선택할 대상"
            />
            <View style={s.row}>
              <Button variant="outline" onPress={detect} loading={busy}>찾기</Button>
              <Button onPress={cmd.toggleListening} loading={cmd.phase === 'thinking'}>
                {cmd.phase === 'listening' ? '말하기 끝' : '말로 선택'}
              </Button>
            </View>
            {cmd.transcript ? <Text style={s.caption}>“{cmd.transcript}” — {cmd.plan?.reply}</Text> : null}
          </>
        ) : (
          <Text style={s.caption}>사진 위를 드래그해서 영역을 지정하세요</Text>
        )}
        <Button variant="primary" onPress={() => router.back()} disabled={!session.selected}>
          {session.selected ? `‘${session.selected.label}’에 말로 명령하기` : '영역을 먼저 선택하세요'}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  stage: { flex: 1, marginHorizontal: 12, marginTop: 12, borderRadius: radius.xl, overflow: 'hidden' },
  drag: { position: 'absolute', borderWidth: 2, borderColor: colors.region, backgroundColor: 'rgba(127,200,255,.2)' },
  tools: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 16 },
  bottom: { padding: 12, paddingBottom: 20, gap: 10 },
  row: { flexDirection: 'row', gap: 8 },
  input: { height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, color: colors.text, paddingHorizontal: 14, fontSize: 15 },
  caption: { color: colors.muted, fontSize: 13 },
});
