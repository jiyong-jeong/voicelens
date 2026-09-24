import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PhotoCanvas } from '@/components/photo-canvas';
import { Header, IconButton } from '@/components/ui';
import { VoiceSheet } from '@/components/voice-sheet';
import { useCommand } from '@/hooks/use-command';
import { useSession } from '@/state/session';
import { colors, radius } from '@/theme/tokens';

/** 02 음성 편집 — 말하면 계획을 보여주고 즉시 적용 */
export default function EditorScreen() {
  const session = useSession();
  const cmd = useCommand({ onSave: () => router.push('/result') });
  const [box, setBox] = useState({ w: 0, h: 0 });
  const state = session.current;
  if (!state) return null;

  const outlines = [...state.regions.map((r) => r.region), ...(session.selected ? [session.selected] : [])];

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
      <View style={s.stage} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {box.w > 0 && <PhotoCanvas state={state} width={box.w} height={box.h} outlines={outlines} highlight={session.selected} />}
      </View>
      <VoiceSheet cmd={cmd} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  stage: { flex: 1, marginHorizontal: 12, marginVertical: 12, borderRadius: radius.xl, overflow: 'hidden' },
  chip: { height: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: colors.line, justifyContent: 'center' },
  chipText: { color: colors.text, fontSize: 14 },
});
