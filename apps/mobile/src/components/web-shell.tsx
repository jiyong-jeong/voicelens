import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSession } from '@/state/session';
import { colors, radius } from '@/theme/tokens';

export type Step = 'cap' | 'edit' | 'region' | 'result';

const STEPS: { id: Step; label: string; href: '/' | '/editor' | '/region' | '/result' }[] = [
  { id: 'cap', label: '촬영', href: '/' },
  { id: 'edit', label: '음성 편집', href: '/editor' },
  { id: 'region', label: '영역 선택', href: '/region' },
  { id: 'result', label: '비교 · 저장', href: '/result' },
];

/** 디자인 W0–W4 상단 바: 워드마크 · 단계 네비 · Space 힌트 */
export function WebTopBar({ step }: { step?: Step }) {
  const { current } = useSession();
  return (
    <View style={s.bar}>
      <Text style={s.word}>
        Voice<Text style={{ color: colors.accent, fontStyle: 'italic' }}>Lens</Text>
      </Text>
      <View accessibilityRole="tablist" style={s.steps}>
        {STEPS.map((st) => {
          const on = st.id === step;
          const disabled = st.id !== 'cap' && !current;
          return (
            <Pressable
              key={st.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: on, disabled }}
              disabled={disabled}
              onPress={() => router.navigate(st.href)}
              style={[s.step, on && { backgroundColor: colors.surface2 }, disabled && { opacity: 0.4 }]}>
              <Text style={{ color: on ? colors.text : colors.muted, fontSize: 14 }}>{st.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={s.hint}>
        <Text style={s.kbd}>Space</Text>
        <Text style={{ color: colors.muted, fontSize: 13 }}>누르고 말하기</Text>
      </View>
    </View>
  );
}

/** 데스크톱 웹 레이아웃: 왼쪽 이미지(stage) + 오른쪽 400px 패널 */
export function WideScaffold({ step, stage, panel, panelCard = true }: { step?: Step; stage: ReactNode; panel: ReactNode; panelCard?: boolean }) {
  return (
    <View style={s.root}>
      <WebTopBar step={step} />
      <View style={s.body}>
        <View style={s.stage}>{stage}</View>
        <View style={[s.panel, panelCard && s.card]}>{panel}</View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  bar: { height: 64, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.surface2 },
  word: { color: colors.text, fontSize: 26, fontFamily: 'Georgia, serif' },
  steps: { flexDirection: 'row', gap: 4 },
  step: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kbd: { color: colors.text, fontSize: 12, fontFamily: 'Menlo', borderWidth: 1, borderColor: colors.line, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  body: { flex: 1, flexDirection: 'row', gap: 20, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24, minHeight: 0 },
  stage: { flex: 1, borderRadius: radius.xl, overflow: 'hidden', minWidth: 0 },
  panel: { width: 400, flexShrink: 0, gap: 16 },
  card: { backgroundColor: colors.surface, borderRadius: radius.sheet, padding: 24 },
});
