import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PhotoCanvas } from '@/components/photo-canvas';
import { Header, IconButton } from '@/components/ui';
import { VoiceSheet } from '@/components/voice-sheet';
import { WideScaffold } from '@/components/web-shell';
import { useCommand } from '@/hooks/use-command';
import { useSpaceToTalk } from '@/hooks/use-space-to-talk';
import { useWide } from '@/lib/layout';
import { useSession } from '@/state/session';
import { colors, radius } from '@/theme/tokens';

/** 02 음성 편집 (웹 W2) — 말하면 계획을 보여주고 즉시 적용 */
export default function EditorScreen() {
  const session = useSession();
  const cmd = useCommand({ onSave: () => router.push('/result') });
  const [box, setBox] = useState({ w: 0, h: 0 });
  const wide = useWide();
  useSpaceToTalk(cmd.toggleListening, cmd.phase !== 'thinking' && cmd.phase !== 'editing');
  const state = session.current;
  // 사진 없이 직접 진입(웹 새로고침/주소 입력) → 촬영으로
  if (!state) return <Redirect href="/" />;

  const outlines = [...state.regions.map((r) => r.region), ...(session.selected ? [session.selected] : [])];
  const stage = (
    <View style={[s.stage, wide && s.stageWide]} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {box.w > 0 && <PhotoCanvas state={state} width={box.w} height={box.h} outlines={outlines} highlight={session.selected} />}
      {wide && <IconButton icon="undo" label="실행 취소" onPress={session.undo} style={s.undo} />}
    </View>
  );

  if (wide) return <WideScaffold step="edit" stage={stage} panel={<VoiceSheet cmd={cmd} variant="panel" />} />;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Header
        left={<IconButton icon="back" label="뒤로" onPress={() => router.back()} />}
        title="편집"
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable accessibilityRole="button" onPress={() => router.push('/region')} style={s.chip}>
              <Text style={s.chipText}>{session.selected ? session.selected.label : '영역 선택'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => router.push('/result')} style={[s.chip, { backgroundColor: colors.text }]}>
              <Text style={[s.chipText, { color: colors.ground, fontWeight: '600' }]}>완료</Text>
            </Pressable>
          </View>
        }
      />
      {stage}
      <VoiceSheet cmd={cmd} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  stage: { flex: 1, marginHorizontal: 12, marginVertical: 12, borderRadius: radius.xl, overflow: 'hidden' },
  stageWide: { margin: 0, marginHorizontal: 0, marginVertical: 0 },
  undo: { position: 'absolute', right: 16, bottom: 16, backgroundColor: 'rgba(14,13,12,.8)' },
  chip: { height: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: colors.line, justifyContent: 'center' },
  chipText: { color: colors.text, fontSize: 14 },
});
