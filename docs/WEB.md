# 웹 지원

같은 코드베이스(`apps/mobile`)를 Expo Web(react-native-web)으로 브라우저에서 실행한다. 별도 웹 앱 없음.

## 실행

```bash
npm run server                 # API (CORS: WEB_ORIGINS)
npm run mobile                 # Expo 개발 서버 → 브라우저에서 http://localhost:8081
# 또는 apps/mobile 에서: npx expo start --web
```

정적 배포: `cd apps/mobile && npx expo export --platform web` → `dist/` (SPA, `web.output: "single"`).
`public/canvaskit.wasm` 이 함께 배포돼야 한다 (postinstall 이 복사).

## 플랫폼 차이와 처리

| 기능 | 네이티브 | 웹 | 코드 |
|---|---|---|---|
| Skia 렌더링 | JSI | CanvasKit(wasm, 약 8MB) 먼저 로드 후 라우터 import | `index.web.js`, `public/canvaskit.wasm` |
| 카메라 | 후면 카메라 | `getUserMedia` 웹캠(전면, 미러) | `app/index.tsx` |
| 권한 | OS 다이얼로그 | **프라이밍 화면(W0)** → 클릭 안에서 카메라 → 마이크 순으로 요청. 차단 시 브라우저 설정 안내 + 업로드로 계속 | `components/permission-gate.tsx` |
| 녹음 | m4a(AAC) | MediaRecorder: Chrome/Firefox `audio/webm`, Safari `audio/mp4`. 실제 타입은 blob 에서 읽음. Gemini 받아쓰기는 webm 도 정상 인식(검증됨) | `lib/media-io.web.ts` |
| 사진 불러오기 | 갤러리 | 파일 선택 + **창 전체 드래그 앤 드롭** | `hooks/use-file-drop.ts` |
| 저장 | 사진 보관함 (`Asset.create`) | 파일 다운로드 | `lib/media-io.web.ts` |
| 공유 | 공유 시트 | Web Share API(파일 지원 시), 아니면 다운로드 | 〃 |
| 음성 시작 | 마이크 버튼 | 마이크 버튼 + **Space 키**(입력창 포커스 시 무시) | `hooks/use-space-to-talk.ts` |
| 레이아웃 | 세로 모바일 | 폭 ≥ 960px: 상단 바(워드마크·단계 네비·Space 힌트) + 이미지 + 오른쪽 400px 패널. 좁은 브라우저는 모바일 레이아웃 | `lib/layout.ts`, `components/web-shell.tsx` |
| 새로고침/직접 주소 진입 | — | 세션이 메모리에만 있으므로 `/editor` 등은 촬영(`/`)으로 리다이렉트 | 각 화면 `<Redirect href="/">` |

플랫폼별 파일은 Metro 가 `*.web.ts` 를 자동 선택한다 (`media-io.ts` / `media-io.web.ts`).

## 디자인
Claude Design 캔버스 두 번째 줄 **W0–W4** (1440×900) 가 웹 화면이다. 모바일과 같은 토큰(`theme/tokens.ts`)을 쓴다. [DESIGN.md](DESIGN.md) 참고.

## 트러블슈팅
- **명령이 두 번 적용됨**: 스택 아래에 깔린 화면도 마운트 상태로 남는다. 키보드·전역 리스너는 반드시 `useIsFocused()` 로 포커스된 화면에서만 동작시킬 것 (`use-space-to-talk.ts` 참고).
- **음성 명령이 아무 반응 없음 / "서버에 연결할 수 없어요"**: 웹은 서버 주소를 `페이지 호스트:8787` 로 자동 계산한다. API 서버가 떠 있는지 확인. 개발 모드 CORS 는 localhost·사설망 IP 를 모두 허용한다(와이파이 변경으로 IP 가 바뀌어도 동작). 네이티브 앱은 `apps/mobile/.env` 의 `EXPO_PUBLIC_API_URL` 을 현재 LAN IP(`ipconfig getifaddr en0`)로 맞춰야 한다.
- **흰 화면 + 콘솔 `Requiring unknown module`**: `index.web.js` 에서 동적 `import()` 를 쓰면 발생. `require()` 로 불러와야 한다(현재 적용됨).
- 흰 화면이면 브라우저 콘솔부터 확인. CanvasKit 로딩 실패 시 화면에 에러 문구가 표시된다.

## 제약 · 주의
- **보안 컨텍스트 필수**: 카메라·마이크는 `https://` 또는 `localhost` 에서만 동작한다. `http://192.168.x.x:8081` 로 다른 기기에서 열면 권한 요청 자체가 불가 → 업로드 경로만 가능. 외부 기기 테스트는 HTTPS 터널(cloudflared, ngrok 등) 필요.
- CanvasKit wasm 이 커서 첫 로딩이 느리다 (캐시 후 빠름). 로딩 화면 추가 권장.
- HEIC 는 Safari 외 브라우저에서 디코딩 불가.
- 운영 도메인은 서버 `WEB_ORIGINS` 에 추가해야 CORS 통과.
