import { CameraView, useCameraPermissions, type FlashMode } from 'expo-camera';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/icon';
import { Button, Header, IconButton } from '@/components/ui';
import { useCommand } from '@/hooks/use-command';
import { toWorkingImage } from '@/lib/photo';
import { useSession } from '@/state/session';
import { colors, radius } from '@/theme/tokens';

/** 01 촬영 — 셔터 또는 "찍어줘" 음성으로 촬영 */
export default function CaptureScreen() {
  const [perm, requestPerm] = useCameraPermissions();
  const cam = useRef<CameraView>(null);
  const [flash, setFlash] = useState<FlashMode>('off');
  const [busy, setBusy] = useState(false);
  const session = useSession();

  async function open(uri: string, w: number, h: number) {
    const { media, width, height } = await toWorkingImage(uri, w, h);
    session.start(media, width, height);
    router.push('/editor');
  }

  async function capture() {
    if (!cam.current || busy) return;
    setBusy(true);
    try {
      const pic = await cam.current.takePictureAsync({ quality: 1 });
      await open(pic.uri, pic.width, pic.height);
    } finally {
      setBusy(false);
    }
  }

  async function pick() {
    const r = await launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    const a = r.assets?.[0];
    if (a) await open(a.uri, a.width, a.height);
  }

  const cmd = useCommand({ onCapture: capture });
  const listening = cmd.phase === 'listening';

  if (!perm) return <View style={s.root} />;
  if (!perm.granted) {
    return (
      <SafeAreaView style={[s.root, s.center]}>
        <Text style={s.permText}>사진을 찍으려면 카메라 권한이 필요해요</Text>
        <Button onPress={requestPerm} style={{ flexGrow: 0, alignSelf: 'stretch', marginHorizontal: 24 }}>
          권한 허용
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <Header
        left={<IconButton icon="flash" label={`플래시 ${flash === 'on' ? '끄기' : '켜기'}`} onPress={() => setFlash(flash === 'on' ? 'off' : 'on')} />}
        title="VoiceLens"
        right={<IconButton icon="settings" label="설정" />}
      />
      <View style={s.viewfinder}>
        <CameraView ref={cam} style={StyleSheet.absoluteFill} facing="back" flash={flash} />
        <View style={s.hint}>
          <View style={[s.dot, listening && { backgroundColor: colors.region }]} />
          <Text style={s.hintText}>
            {listening ? '듣고 있어요… 한 번 더 누르면 끝' : cmd.transcript ? `“${cmd.transcript}”` : '“찍어줘”라고 말하면 바로 촬영돼요'}
          </Text>
        </View>
      </View>
      <View style={s.controls}>
        <Pressable accessibilityRole="button" accessibilityLabel="갤러리에서 불러오기" onPress={pick} style={s.thumb} />
        <Pressable accessibilityRole="button" accessibilityLabel="촬영" onPress={capture} style={s.shutter}>
          <View style={[s.shutterInner, busy && { opacity: 0.5 }]} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={listening ? '음성 명령 끝내기' : '음성 명령'}
          onPress={cmd.toggleListening}
          style={[s.mic, listening && { backgroundColor: colors.text }]}>
          <Icon name="mic" size={22} color={colors.onAccent} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  center: { justifyContent: 'center', alignItems: 'center', gap: 16 },
  permText: { color: colors.text, fontSize: 16 },
  viewfinder: { flex: 1, marginHorizontal: 12, marginTop: 8, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.surface2 },
  hint: { position: 'absolute', left: 16, right: 16, bottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.lg, backgroundColor: 'rgba(14,13,12,.82)', borderWidth: 1, borderColor: colors.line },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  hintText: { color: colors.text, fontSize: 14, flexShrink: 1 },
  controls: { height: 140, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 36 },
  thumb: { width: 52, height: 52, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface2 },
  shutter: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.text },
  mic: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
});
