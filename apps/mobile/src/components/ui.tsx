import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, hit, radius } from '@/theme/tokens';
import { Icon, type IconName } from './icon';

export function IconButton({ icon, label, onPress, style }: { icon: IconName; label: string; onPress?: () => void; style?: ViewStyle }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6} style={({ pressed }) => [s.iconBtn, pressed && s.pressed, style]}>
      <Icon name={icon} />
    </Pressable>
  );
}

export function Button({
  children, onPress, variant = 'primary', loading, disabled, style,
}: { children: ReactNode; onPress?: () => void; variant?: 'primary' | 'outline' | 'light'; loading?: boolean; disabled?: boolean; style?: ViewStyle }) {
  const fg = variant === 'primary' ? colors.onAccent : variant === 'light' ? colors.ground : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [s.btn, s[variant], (pressed || disabled) && s.pressed, style]}>
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[s.btnText, { color: fg }]}>{children}</Text>}
    </Pressable>
  );
}

export function Header({ left, title, right }: { left?: ReactNode; title?: string; right?: ReactNode }) {
  return (
    <View style={s.header}>
      <View style={s.side}>{left}</View>
      {title ? <Text style={s.title}>{title}</Text> : null}
      <View style={[s.side, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

export function Pill({ label, tone = 'region' }: { label: string; tone?: 'region' | 'accent' | 'dark' }) {
  const bg = tone === 'region' ? colors.region : tone === 'accent' ? colors.accent : 'rgba(14,13,12,.8)';
  const fg = tone === 'region' ? colors.onRegion : tone === 'accent' ? colors.onAccent : colors.text;
  return (
    <View style={[s.pill, { backgroundColor: bg }]}>
      <Text style={[s.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  iconBtn: { width: hit, height: hit, borderRadius: hit / 2, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  btn: { height: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, flexGrow: 1 },
  primary: { backgroundColor: colors.accent },
  outline: { borderWidth: 1, borderColor: colors.line },
  light: { backgroundColor: colors.text },
  btnText: { fontSize: 15, fontWeight: '600' },
  header: { height: 60, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side: { minWidth: hit, flexShrink: 0 },
  title: { color: colors.text, fontSize: 16, fontWeight: '600' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  pillText: { fontSize: 12, fontWeight: '600' },
});
