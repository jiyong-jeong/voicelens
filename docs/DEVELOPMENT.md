# 개발 가이드

## 사전 준비
- Node 22 (`nvm use` — 루트 `.nvmrc`)
- iOS: Xcode + 시뮬레이터 / Android: Android Studio 에뮬레이터, 또는 실기기 + Expo Go
- 카메라·마이크는 **실기기**에서 테스트 (iOS 시뮬레이터에는 카메라가 없음. 갤러리 불러오기로 대체 가능)

## 실행

```bash
nvm use
npm --prefix apps/server install
npm --prefix apps/mobile install

# 터미널 1 — API 서버
npm run server          # http://localhost:8787, /health 로 확인

# 터미널 2 — 앱
npm run mobile          # i: iOS 시뮬레이터, a: Android, QR: 실기기
```

실기기에서 테스트할 때는 `apps/mobile/.env` 의 `EXPO_PUBLIC_API_URL` 을 Mac의 LAN IP로 바꾼다
(`ipconfig getifaddr en0` → `http://<IP>:8787`). `.env` 를 바꾸면 Expo 서버를 재시작.

Skia·카메라 등 네이티브 모듈이 Expo Go에서 동작하지 않으면 개발 빌드를 만든다:
`cd apps/mobile && npx expo run:ios` (또는 `run:android`).

## 검증

```bash
npm run typecheck       # 서버 tsc + 앱 tsc
npm run smoke           # Gemini 4개 기능 실호출 (받아쓰기/계획/감지/편집)
```

`smoke` 는 `apps/server/scripts/fixtures/` 의 `voice.m4a`(macOS `say -v Yuna` 로 생성), `photo.jpg`(Gemini 이미지 모델로 생성한 공원 사진 — 하늘·나무·인물 포함) 를 사용하고
편집 결과를 `edited.png` 로 저장한다(커밋 제외).

API 수동 호출 예시는 [SYSTEM.md](SYSTEM.md#1-서버-api-appsserver).

## 자주 하는 작업

**모델 교체** — `apps/server/.env` 의 `GEMINI_MODEL_*` 만 바꾸고 서버 재시작. 사용 가능한 모델 목록:
```bash
curl -s "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200" -H "x-goog-api-key: $GEMINI_API_KEY" | jq -r '.models[].name'
```

**보정 항목 추가** (예: `clarity`)
1. `server/src/llm/schema.ts` 의 `Adjustments` 에 필드 추가 (범위·describe 포함)
2. `mobile/src/lib/types.ts` 미러 수정
3. `mobile/src/lib/color-matrix.ts` 의 `toMatrix`/`KEYS`/`LABELS` 에 반영 (매트릭스로 안 되면 `PhotoCanvas` 에 셰이더 단계 추가)
4. 필요하면 `prompts.ts` 의 가이드 수치 조정 → `npm run smoke`

**새 LLM 공급자 추가** — [SYSTEM.md §3](SYSTEM.md#3-llm-공급자-추상화)

**새 intent 추가** — `schema.ts` enum → `types.ts` → `prompts.ts` 규칙 → `hooks/use-command.ts` 의 `switch`

## 디버깅 팁
- 서버 로그에 요청 경로·상태·시간이 찍힌다 (hono logger). LLM 에러 메시지는 `{error}` 로 앱까지 전달되어 음성 시트에 표시된다.
- 받아쓰기가 빈 문자열이면: 녹음 권한, `setAudioModeAsync({allowsRecording:true})`, mimeType(`audio/mp4`) 확인. Gemini 받아쓰기 모델은 결과를 `audioTranscription` 파트로 준다.
- 영역 외곽선이 어긋나면: `fitRect` 에 넘기는 `width/height` 가 `toWorkingImage` 결과(실제 인코딩 크기)인지 확인.
