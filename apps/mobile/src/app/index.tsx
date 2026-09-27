import { requestRecordingPermissionsAsync } from 'expo-audio';
import { CameraView, useCameraPermissions, type FlashMode } from 'expo-camera';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/icon';
import { PermissionGate } from '@/components/permission-gate';
import { Button, Header, IconButton } from '@/components/ui';
import { WebTopBar, WideScaffold } from '@/components/web-shell';
import { useCommand } from '@/hooks/use-command';
import { useFileDrop } from '@/hooks/use-file-drop';
import { useSpaceToTalk } from '@/hooks/use-space-to-talk';
import { isWeb, useWide } from '@/lib/layout';
import { toWorkingImage } from '@/lib/photo';
import { useSession } from '@/state/session';
import { colors, radius } from '@/theme/tokens';

/** 01 촬영 (웹 W0·W1) — 셔터 또는 "찍어줘" 음성으로 촬영, 웹은 업로드/드래그 앤 드롭도 */
export default function CaptureScreen() {
  const [perm, requestPerm] = useCameraPermissions();
  const cam = useRef<CameraView>(null);
  const [flash, setFlash] = useState<FlashMode>('off');
  const [busy, setBusy] = useState(false);
  const [uploadOnly, setUploadOnly] = useState(false);
  const session = useSession();
  const wide = useWide();

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

  /** 웹: 브라우저 프롬프트는 사용자 클릭 안에서 카메라 → 마이크 순서로 요청 */
  async function allow() {
    const c = await requestPerm();
    if (c.granted) await requestRecordingPermissionsAsync().catch(() => undefined);
  }

  const cmd = useCommand({ onCapture: capture });
  const listening = cmd.phase === 'listening';
  const { dragging } = useFileDrop((img) => open(img.uri, img.width, img.height));
  const cameraOn = !!perm?.granted && !uploadOnly;
  useSpaceToTalk(cmd.toggleListening, cameraOn);

  if (!perm) return <View style={s.root} />;

  // 권한 없음: 웹은 디자인 W0(프라이밍/차단 안내), 네이티브는 기존 요청 화면
  if (!perm.granted && !uploadOnly) {
    if (isWeb) {
      return (
        <View style={s.root}>
          {wide && <WebTopBar step="cap" />}
          <PermissionGate denied={perm.status === 'denied'} onAllow={allow} onUploadOnly={() => setUploadOnly(true)} />
        </View>
      );
    }
    return (
      <SafeAreaView style={[s.root, s.center]}>
        <Text style={s.permText}>사진을 찍으려면 카메라 권한이 필요해요</Text>
        <Button onPress={requestPerm} style={{ flexGrow: 0, alignSelf: 'stretch', marginHorizontal: 24 }}>
          권한 허용
        </Button>
      </SafeAreaView>
    );
  }

  const hint = listening
    ? '듣고 있어요… 한 번 더 누르면 끝'
    : cmd.phase === 'thinking'
      ? '이해하는 중…'
      : cmd.error
        ? cmd.error
        : cmd.plan && cmd.plan.intent !== 'capture'
          ? `“${cmd.transcript}” — ${cmd.plan.reply}`
          : cmd.transcript
      ? `“${cmd.transcript}”`
      : cameraOn
        ? '“찍어줘”라고 말하면 바로 촬영돼요'
        : '사진을 끌어다 놓거나 불러와서 시작하세요';

  const viewfinder = (
    <View style={[s.viewfinder, wide && s.viewfinderWide]}>
      {cameraOn ? (
        <CameraView ref={cam} style={StyleSheet.absoluteFill} facing={isWeb ? 'front' : 'back'} mirror={isWeb} flash={flash} />
      ) : (
        <Pressable accessibilityRole="button" onPress={pick} style={[StyleSheet.absoluteFill, s.center]}>
          <Icon name="upload" size={32} color={colors.muted} />
          <Text style={s.dropTitle}>사진 불러오기</Text>
        </Pressable>
      )}
      {dragging && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.dropOverlay]}>
          <Text style={s.dropTitle}>여기에 놓으면 편집을 시작해요</Text>
        </View>
      )}
      <View style={[s.hint, wide && s.hintWide]}>
        <View style={[s.dot, listening && { backgroundColor: colors.region }, !!cmd.error && { backgroundColor: colors.danger }]} />
        <Text style={s.hintText}>{hint}</Text>
      </View>
    </View>
  );

  const shutter = (
    <Pressable accessibilityRole="button" accessibilityLabel="촬영" onPress={capture} disabled={!cameraOn} style={[s.shutter, !cameraOn && { opacity: 0.3 }]}>
      <View style={[s.shutterInner, busy && { opacity: 0.5 }]} />
    </Pressable>
  );
  const mic = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={listening ? '음성 명령 끝내기' : '음성 명령'}
      onPress={cmd.toggleListening}
      style={[s.mic, listening && { backgroundColor: colors.text }]}>
      <Icon name="mic" size={22} color={colors.onAccent} />
    </Pressable>
  );

  // 데스크톱 웹 — 디자인 W1
  if (wide) {
    return (
      <WideScaffold
        step="cap"
        stage={viewfinder}
        panelCard={false}
        panel={
          <>
            <View style={s.introCard}>
              <Text style={s.introTitle}>찍고, 말하면{'\n'}보정돼요</Text>
              <Text style={s.introBody}>촬영 버튼을 누르거나 “찍어줘”라고 말해 보세요. 사진을 불러와서 시작해도 돼요.</Text>
              <View style={s.introButtons}>
                {shutter}
                {mic}
              </View>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="사진 불러오기" onPress={pick} style={[s.dropzone, dragging && { borderColor: colors.accent }]}>
              <Icon name="upload" size={28} color={colors.muted} />
              <Text style={s.dropTitle}>사진을 끌어다 놓기</Text>
              <Text style={s.dropSub}>또는 클릭해서 선택 · JPG, PNG</Text>
            </Pressable>
          </>
        }
      />
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <Header
        left={
          cameraOn && !isWeb ? (
            <IconButton icon="flash" label={`플래시 ${flash === 'on' ? '끄기' : '켜기'}`} onPress={() => setFlash(flash === 'on' ? 'off' : 'on')} />
          ) : undefined
        }
        title="VoiceLens"
        right={<IconButton icon="settings" label="설정" />}
      />
      {viewfinder}
      <View style={s.controls}>
        <Pressable accessibilityRole="button" accessibilityLabel="갤러리에서 불러오기" onPress={pick} style={s.thumb} />
        {shutter}
        {mic}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  center: { justifyContent: 'center', alignItems: 'center', gap: 16 },
  permText: { color: colors.text, fontSize: 16 },
  viewfinder: { flex: 1, marginHorizontal: 12, marginTop: 8, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.surface2 },
  viewfinderWide: { marginHorizontal: 0, marginTop: 0 },
  dropOverlay: { backgroundColor: 'rgba(14,13,12,.8)', borderWidth: 2, borderColor: colors.accent, borderStyle: 'dashed', borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  hint: { position: 'absolute', left: 16, right: 16, bottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.lg, backgroundColor: 'rgba(14,13,12,.82)', borderWidth: 1, borderColor: colors.line },
  hintWide: { left: undefined, right: undefined, alignSelf: 'center', bottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  hintText: { color: colors.text, fontSize: 14, flexShrink: 1 },
  controls: { height: 140, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 36 },
  thumb: { width: 52, height: 52, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface2 },
  shutter: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.text },
  mic: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  introCard: { backgroundColor: colors.surface, borderRadius: radius.sheet, padding: 24, gap: 18 },
  introTitle: { color: colors.text, fontSize: 32, lineHeight: 38, fontFamily: 'Georgia, serif' },
  introBody: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  introButtons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, paddingVertical: 8 },
  dropzone: { flex: 1, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line, borderRadius: radius.sheet, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  dropTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  dropSub: { color: colors.muted, fontSize: 13 },
});
