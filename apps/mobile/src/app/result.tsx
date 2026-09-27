import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/icon';
import { PhotoCanvas, renderToJpeg } from '@/components/photo-canvas';
import { Button, Header, IconButton, Pill } from '@/components/ui';
import { WideScaffold } from '@/components/web-shell';
import { isWeb, useWide } from '@/lib/layout';
import { saveImage, shareImage } from '@/lib/media-io';
import { WORKING_MAX } from '@/lib/photo';
import { useSession } from '@/state/session';
import { colors, radius } from '@/theme/tokens';

/** 04 비교·저장 (웹 W4) — 원본/보정 분할 비교, 명령 이력, 저장(앱: 앨범 / 웹: 다운로드) */
export default function ResultScreen() {
  const session = useSession();
  const wide = useWide();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [split, setSplit] = useState(0.5);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { current, original } = session;
  if (!current || !original) return <Redirect href="/" />;

  const move = (e: GestureResponderEvent) => setSplit(Math.min(1, Math.max(0, e.nativeEvent.locationX / box.w)));

  async function run(task: (jpeg: string) => Promise<unknown>) {
    if (!current) return;
    setSaving(true);
    setMessage(null);
    try {
      const out = await task(await renderToJpeg(current));
      if (typeof out === 'string') setMessage(out);
    } catch (e) {
      // 사용자가 공유 시트를 닫은 경우(AbortError)는 에러로 보지 않음
      if ((e as Error).name !== 'AbortError') setMessage((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const stage = (
    <View
      style={[s.stage, wide && s.stageWide, isWeb && ({ cursor: 'ew-resize' } as object)]}
      onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      onStartShouldSetResponder={() => true}
      onResponderGrant={move}
      onResponderMove={move}
      accessibilityLabel="원본과 보정 비교. 좌우로 끌어서 비교"
      accessibilityRole="adjustable">
      {box.w > 0 && (
        <>
          <PhotoCanvas state={original} width={box.w} height={box.h} applyEdits={false} />
          <View style={[s.after, { left: split * box.w, width: (1 - split) * box.w }]}>
            <View style={{ marginLeft: -split * box.w }}>
              <PhotoCanvas state={current} width={box.w} height={box.h} />
            </View>
          </View>
          <View pointerEvents="none" style={[s.divider, { left: split * box.w - 1 }]} />
          <View pointerEvents="none" style={[s.handle, { left: split * box.w - 22, top: box.h / 2 - 22 }]}>
            <Icon name="compare" color={colors.ground} />
          </View>
          <View pointerEvents="none" style={[s.tag, { left: 12 }]}><Pill label="원본" tone="dark" /></View>
          <View pointerEvents="none" style={[s.tag, { right: 12 }]}><Pill label="보정" tone="accent" /></View>
        </>
      )}
    </View>
  );

  const history = (
    <>
      {session.history.length === 0 && <Text style={s.caption}>아직 적용된 명령이 없어요</Text>}
      {session.history.map((h, i) => (
        <View key={i} style={[s.item, wide && { backgroundColor: colors.surface2 }]}>
          <Text style={s.said}>“{h.said}”</Text>
          <Text style={s.summary}>{h.summary}</Text>
        </View>
      ))}
    </>
  );

  const actions = (
    <View style={{ gap: 10 }}>
      <Text style={s.caption}>{message ?? `편집 해상도(최대 ${WORKING_MAX}px) JPG로 저장돼요`}</Text>
      <View style={s.row}>
        <Button variant="outline" onPress={() => run(shareImage)} disabled={saving}>공유</Button>
        <Button onPress={() => run(saveImage)} loading={saving}>{isWeb ? '다운로드' : '앨범에 저장'}</Button>
      </View>
    </View>
  );

  if (wide) {
    return (
      <WideScaffold
        step="result"
        stage={stage}
        panel={
          <>
            <View style={s.panelHead}>
              <Text style={s.panelTitle}>적용된 명령</Text>
              <IconButton icon="undo" label="실행 취소" onPress={session.undo} />
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 12 }}>{history}</ScrollView>
            {actions}
          </>
        }
      />
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <Header
        left={<IconButton icon="back" label="뒤로" onPress={() => router.back()} />}
        title="비교"
        right={<IconButton icon="undo" label="실행 취소" onPress={session.undo} />}
      />
      {stage}
      <ScrollView style={{ flexGrow: 0, maxHeight: 180 }} contentContainerStyle={s.history}>
        <Text style={s.caption}>적용된 명령</Text>
        {history}
      </ScrollView>
      <View style={{ padding: 16, paddingBottom: 20 }}>{actions}</View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  stage: { flex: 1, marginHorizontal: 12, marginTop: 12, borderRadius: radius.xl, overflow: 'hidden' },
  stageWide: { marginHorizontal: 0, marginTop: 0 },
  after: { position: 'absolute', top: 0, bottom: 0, overflow: 'hidden' },
  divider: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: colors.text },
  handle: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  tag: { position: 'absolute', bottom: 12 },
  history: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  caption: { color: colors.muted, fontSize: 12 },
  item: { padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, gap: 4 },
  said: { color: colors.text, fontSize: 14 },
  summary: { color: colors.muted, fontSize: 12 },
  row: { flexDirection: 'row', gap: 10 },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
});
