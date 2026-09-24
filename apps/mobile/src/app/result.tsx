import type { CanvasRef } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/icon';
import { PhotoCanvas } from '@/components/photo-canvas';
import { Button, Header, IconButton, Pill } from '@/components/ui';
import { useSession } from '@/state/session';
import { colors, radius } from '@/theme/tokens';

/** 04 비교·저장 — 원본/보정 분할 비교, 명령 이력, 앨범 저장 */
export default function ResultScreen() {
  const session = useSession();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [split, setSplit] = useState(0.5);
  const [saving, setSaving] = useState(false);
  const [savedUri, setSavedUri] = useState<string | null>(null);
  const canvasRef = useRef<CanvasRef>(null);
  const { current, original } = session;
  if (!current || !original) return null;

  const move = (e: GestureResponderEvent) => setSplit(Math.min(1, Math.max(0, e.nativeEvent.locationX / box.w)));

  async function exportFile() {
    // TODO(docs/ISSUES.md): 화면 해상도 스냅샷 → 원본 해상도 오프스크린 렌더로 교체
    const img = canvasRef.current?.makeImageSnapshot();
    if (!img) throw new Error('이미지를 만들 수 없어요');
    const file = new File(Paths.cache, `voicelens-${Date.now()}.jpg`);
    file.write(img.encodeToBase64(), { encoding: 'base64' });
    return file.uri;
  }

  async function save() {
    setSaving(true);
    try {
      const perm = await requestPermissionsAsync(true);
      if (!perm.granted) throw new Error('사진 보관함 권한이 필요해요');
      const uri = await exportFile();
      await Asset.create(uri);
      setSavedUri(uri);
    } finally {
      setSaving(false);
    }
  }

  async function share() {
    const uri = savedUri ?? (await exportFile());
    await Share.share({ url: uri });
  }

  return (
    <SafeAreaView style={s.root}>
      <Header
        left={<IconButton icon="back" label="뒤로" onPress={() => router.back()} />}
        title="비교"
        right={<IconButton icon="undo" label="실행 취소" onPress={session.undo} />}
      />
      <View
        style={s.stage}
        onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        onStartShouldSetResponder={() => true}
        onResponderGrant={move}
        onResponderMove={move}>
        {box.w > 0 && (
          <>
            <PhotoCanvas state={original} width={box.w} height={box.h} applyEdits={false} />
            <View style={[s.after, { left: split * box.w, width: (1 - split) * box.w }]}>
              <View style={{ marginLeft: -split * box.w }}>
                <PhotoCanvas state={current} width={box.w} height={box.h} canvasRef={canvasRef} />
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

      <ScrollView style={{ flexGrow: 0, maxHeight: 180 }} contentContainerStyle={s.history}>
        <Text style={s.caption}>적용된 명령</Text>
        {session.history.length === 0 && <Text style={s.caption}>아직 적용된 명령이 없어요</Text>}
        {session.history.map((h, i) => (
          <View key={i} style={s.item}>
            <Text style={s.said}>“{h.said}”</Text>
            <Text style={s.summary}>{h.summary}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={s.actions}>
        <Button variant="outline" onPress={share}>공유</Button>
        <Button onPress={save} loading={saving}>{savedUri ? '저장됨' : '앨범에 저장'}</Button>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  stage: { flex: 1, marginHorizontal: 12, marginTop: 12, borderRadius: radius.xl, overflow: 'hidden' },
  after: { position: 'absolute', top: 0, bottom: 0, overflow: 'hidden' },
  divider: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: colors.text },
  handle: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  tag: { position: 'absolute', bottom: 12 },
  history: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  caption: { color: colors.muted, fontSize: 12 },
  item: { padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, gap: 4 },
  said: { color: colors.text, fontSize: 14 },
  summary: { color: colors.muted, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 20 },
});
