// 웹 진입점: Skia 는 모듈 로드 시점에 global.CanvasKit 을 참조하므로
// CanvasKit(wasm)을 먼저 올린 뒤 라우터(= 모든 화면 모듈)를 실행해야 한다.
// 주의: 동적 import() 를 쓰면 Metro 개발 서버(lazy 번들)에서 "Requiring unknown module" 로 흰 화면이 된다.
//       require() 는 모듈을 같은 번들에 넣되 호출 시점에만 실행하므로 순서가 보장된다.
import '@expo/metro-runtime';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

LoadSkiaWeb({ locateFile: (file) => `/${file}` })
  .then(() => {
    require('expo-router/entry');
  })
  .catch((e) => {
    document.body.innerHTML = `<pre style="color:#F3EFE8;background:#0E0D0C;padding:24px;margin:0;height:100vh">VoiceLens 를 시작하지 못했어요.\n${String(e)}</pre>`;
  });
