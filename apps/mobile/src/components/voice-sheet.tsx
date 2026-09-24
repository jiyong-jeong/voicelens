import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { describe } from '@/lib/color-matrix';
import type { useCommand } from '@/hooks/use-command';
import { colors, radius } from '@/theme/tokens';
import { Button } from './ui';

type Cmd = ReturnType<typeof useCommand>;

const STATUS: Record<Cmd['phase'], string> = {
  idle: '말하거나 입력해서 보정하세요',
  listening: '듣는 중',
  thinking: '이해하는 중…',
  editing: 'AI로 이미지를 편집하는 중…',
  done: '이렇게 적용했어요',
  error: '문제가 생겼어요',
};

/** 파형: 최근 18개 미터링 값을 막대로 */
function Waveform({ level, active }: { level: number; active: boolean }) {
  const [bars, setBars] = useState<number[]>(Array(18).fill(4));
  const last = useRef(level);
  last.current = level;
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      const h = Math.max(4, Math.min(28, ((last.current + 60) / 60) * 28));
      setBars((b) => [...b.slice(1), h]);
    }, 90);
    return () => clearInterval(id);
  }, [active]);
  return (
    <View style={s.wave} accessibilityElementsHidden>
      {bars.map((h, i) => (
        <View key={i} style={[s.bar, { height: h, opacity: active ? 1 : 0.35 }]} />
      ))}
    </View>
  );
}

export function VoiceSheet({ cmd }: { cmd: Cmd }) {
  const [typed, setTyped] = useState('');
  const listening = cmd.phase === 'listening';
  const busy = cmd.phase === 'thinking' || cmd.phase === 'editing';
  const secs = Math.floor(cmd.voice.durationMs / 1000).toString().padStart(2, '0');

  return (
    <View style={s.sheet}>
      <View style={s.row}>
        <Waveform level={cmd.voice.level} active={listening} />
        {busy && <ActivityIndicator color={colors.accent} size="small" />}
        <Text style={s.status}>
          {STATUS[cmd.phase]}
          {listening ? ` · 00:${secs}` : ''}
        </Text>
      </View>

      {cmd.transcript ? <Text style={s.transcript}>“{cmd.transcript}”</Text> : null}
      {cmd.error ? <Text style={[s.status, { color: colors.danger }]}>{cmd.error}</Text> : null}

      {cmd.plan && cmd.phase === 'done' && (
        <View style={{ gap: 8 }}>
          <Text style={s.caption}>{cmd.plan.reply}</Text>
          {cmd.plan.operations
            .filter((o) => o.adjustments && describe(o.adjustments))
            .map((o, i) => (
              <View key={i} style={s.op}>
                <View style={s.opLabel}>
                  <View style={[s.dot, { backgroundColor: o.target === 'global' ? colors.accent : colors.region }]} />
                  <Text style={s.opName}>{o.target === 'global' ? '전체' : o.regionLabel}</Text>
                </View>
                <Text style={s.opVals}>{describe(o.adjustments)}</Text>
              </View>
            ))}
        </View>
      )}

      {!listening && !busy && (
        <TextInput
          value={typed}
          onChangeText={setTyped}
          placeholder="또는 입력: 인물만 조금 밝게"
          placeholderTextColor={colors.muted}
          style={s.input}
          returnKeyType="send"
          onSubmitEditing={() => {
            if (typed.trim()) cmd.submitText(typed.trim());
            setTyped('');
          }}
          accessibilityLabel="명령 입력"
        />
      )}

      <View style={s.actions}>
        <Button variant={listening ? 'light' : 'primary'} onPress={cmd.toggleListening} disabled={busy}>
          {listening ? '말하기 끝' : cmd.transcript ? '다시 말하기' : '말로 보정하기'}
        </Button>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, padding: 20, paddingBottom: 28, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 28 },
  bar: { width: 3, borderRadius: 2, backgroundColor: colors.accent },
  status: { color: colors.muted, fontSize: 12, fontFamily: 'Menlo' },
  transcript: { color: colors.text, fontSize: 24, lineHeight: 30 },
  caption: { color: colors.muted, fontSize: 12 },
  op: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: radius.md, backgroundColor: colors.surface2, gap: 8 },
  opLabel: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  opName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  opVals: { color: colors.textSoft, fontSize: 12, fontFamily: 'Menlo', flexShrink: 1, textAlign: 'right' },
  input: { height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, color: colors.text, paddingHorizontal: 14, fontSize: 15 },
  actions: { flexDirection: 'row', gap: 10 },
});
