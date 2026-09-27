import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/theme/tokens';
import { Icon } from './icon';
import { Button } from './ui';

/**
 * 디자인 W0 — 브라우저 권한 프롬프트 전에 이유를 먼저 설명(프라이밍)하고,
 * 차단된 경우 브라우저 설정에서 다시 허용하는 방법 + 업로드 대체 경로를 안내한다.
 */
export function PermissionGate({ denied, onAllow, onUploadOnly }: { denied: boolean; onAllow: () => void; onUploadOnly: () => void }) {
  if (denied) {
    return (
      <View style={s.wrap}>
        <View style={s.card}>
          <Text style={s.title}>권한이 차단돼 있어요</Text>
          <Text style={s.body}>브라우저 설정에서 다시 허용할 수 있어요. 그동안에도 사진 업로드와 텍스트 입력으로 모든 보정을 쓸 수 있어요.</Text>
          <View style={s.steps}>
            {['주소창 왼쪽의 사이트 설정 아이콘 클릭', '카메라 · 마이크를 ‘허용’으로 변경', '페이지 새로고침'].map((t, i) => (
              <Text key={t} style={s.stepText}>{`${i + 1}. ${t}`}</Text>
            ))}
          </View>
          <View style={s.row}>
            <Button variant="outline" onPress={onAllow}>다시 시도</Button>
            <Button variant="light" onPress={onUploadOnly}>사진 업로드로 계속</Button>
          </View>
        </View>
      </View>
    );
  }
  return (
    <View style={s.wrap}>
      <View style={s.card}>
        <Text style={s.title}>카메라와 마이크를{'\n'}켜 주세요</Text>
        <Text style={s.body}>다음 단계에서 브라우저가 권한을 물어봐요. ‘허용’을 누르면 앱과 똑같이 쓸 수 있어요.</Text>
        <View style={{ gap: 8 }}>
          <View style={s.item}>
            <Icon name="camera" size={22} />
            <View><Text style={s.itemTitle}>카메라</Text><Text style={s.itemSub}>웹캠으로 바로 촬영</Text></View>
          </View>
          <View style={s.item}>
            <Icon name="mic" size={22} color={colors.accent} />
            <View><Text style={s.itemTitle}>마이크</Text><Text style={s.itemSub}>말로 보정 · 녹음은 명령할 때만 켜져요</Text></View>
          </View>
        </View>
        <View style={s.row}>
          <Button variant="outline" onPress={onUploadOnly}>사진 업로드로 시작</Button>
          <Button onPress={onAllow}>권한 허용하기</Button>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.ground },
  card: { width: '100%', maxWidth: 480, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sheet, padding: 32, gap: 20 },
  title: { color: colors.text, fontSize: 34, lineHeight: 40, fontFamily: 'Georgia, serif' },
  body: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radius.md, backgroundColor: colors.surface2 },
  itemTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  itemSub: { color: colors.muted, fontSize: 13 },
  steps: { padding: 16, borderRadius: radius.md, backgroundColor: colors.surface2, gap: 6 },
  stepText: { color: colors.text, fontSize: 14, lineHeight: 22 },
  row: { flexDirection: 'row', gap: 10 },
});
