# 시스템 상세

## 1. 서버 API (`apps/server`)

기본 URL `http://localhost:8787`. `/api/*` 는 모두 `POST`, JSON, 헤더 `x-app-token: $APP_TOKEN` 필수(없으면 401), 본문 최대 20MB.
에러 응답: `{ "error": string }` — zod 검증 실패는 400, 그 외 500.

`Media = { data: string /* base64, data: 접두사 없음 */, mimeType: string }`

| 메서드 | 경로 | 요청 | 응답 | 모델 |
|---|---|---|---|---|
| GET | `/health` | — | `{ok, provider, models}` | — |
| POST | `/api/transcribe` | `{audio: Media}` | `{text}` | transcribe |
| POST | `/api/plan` | `{text, image?: Media, selectedRegion?: Region}` | `EditPlan` | reasoning |
| POST | `/api/voice-command` | `{audio, image?, selectedRegion?}` | `{text, plan: EditPlan \| null}` | transcribe → reasoning |
| POST | `/api/detect` | `{image, query}` | `{regions: Region[]}` | reasoning |
| POST | `/api/edit` | `{image, instruction, region?}` | `{image: Media}` | image-edit |

예시:

```bash
curl -s -X POST localhost:8787/api/plan \
  -H 'content-type: application/json' -H 'x-app-token: dev-local-token' \
  -d '{"text":"전체적으로 따뜻하고 약간 어둡게, 비네팅도 살짝"}'
# → {"intent":"adjust","reply":"…","regions":[],
#    "operations":[{"target":"global","adjustments":{"exposure":-0.3,"temperature":25,"vignette":25}}]}
```

## 2. 편집 계획 스키마 (`apps/server/src/llm/schema.ts`)

```ts
Region      = { label: string; box: [ymin, xmin, ymax, xmax] }   // 0–1000 정규화
Adjustments = {                                                    // 모두 선택, 0 = 변화 없음
  exposure?: -2..2 (EV)   contrast?: -100..100   saturation?: -100..100
  temperature?: -100..100 (−파랑 / +주황)   tint?: -100..100 (−초록 / +마젠타)
  highlights?: -100..100  shadows?: -100..100    vignette?: 0..100
}
Operation   = { target: 'global' | 'region'; regionLabel?; adjustments?; generativePrompt? /* 영어 */ }
EditPlan    = { intent; reply /* 한국어 한 문장 */; regions: Region[]; operations: Operation[] }
```

앱 미러: `apps/mobile/src/lib/types.ts` — 스키마 변경 시 함께 수정.
프롬프트: `apps/server/src/llm/prompts.ts` (`PLAN_SYSTEM`, `DETECT_SYSTEM`, `TRANSCRIBE_PROMPT`).

## 3. LLM 공급자 추상화

```ts
interface LLMProvider {
  name: string;
  transcribe(audio: Media, opts?): Promise<string>;
  planCommand({ text, image?, selectedRegion? }): Promise<EditPlan>;
  detectRegions({ image, query }): Promise<Region[]>;
  editImage({ image, instruction, region? }): Promise<Media>;
}
```

- 구현: `llm/gemini.ts` (`createGeminiProvider`)
- 등록/선택: `llm/index.ts` 의 `registry` + `LLM_PROVIDER`
- 새 공급자 추가 절차: ① `llm/<name>.ts` 에 인터페이스 구현 ② `registry` 에 등록 ③ `config.ts` 에 키/모델 env 추가 ④ `npm run smoke` 를 해당 공급자로 실행

Gemini 구현 메모:
- 구조화 출력: `responseMimeType: 'application/json'` + `responseJsonSchema: z.toJSONSchema(schema)` 후 `schema.parse`.
- 받아쓰기 모델은 응답 파트가 `{ audioTranscription: { text } }` — `res.text` 는 비어 있음.
- 이미지 편집은 `responseModalities: ['IMAGE','TEXT']`, 첫 `inlineData` 파트를 결과로 사용. 영역 한정은 프롬프트로 박스를 전달하는 방식(모델이 영역 밖도 바꿀 수 있음 → ISSUES.md T-4).
- 결과 이미지에는 C2PA/SynthID 메타데이터가 포함된다.

## 4. 모바일 앱 (`apps/mobile/src`)

| 경로 | 역할 |
|---|---|
| `app/_layout.tsx` | Stack 네비게이션, `SessionProvider`, 다크 배경 |
| `app/index.tsx` | 01 촬영 — CameraView, 갤러리, "찍어줘" 음성 촬영 |
| `app/editor.tsx` | 02 음성 편집 — 캔버스 + `VoiceSheet` |
| `app/region.tsx` | 03 영역 선택 — AI 감지(텍스트/음성), 사각형 드래그 |
| `app/result.tsx` | 04 비교·저장 — 분할 비교 슬라이더, 명령 이력, 앨범 저장/공유 |
| `state/session.tsx` | undo 스택(`EditState[]`), 이력, 선택 영역 |
| `hooks/use-voice-recorder.ts` | 녹음 시작/정지 → base64 m4a, 미터링 |
| `hooks/use-command.ts` | 명령 파이프라인 + intent 실행, 텍스트 입력 대체 경로 |
| `components/photo-canvas.tsx` | Skia 비파괴 렌더러, 좌표 변환(`fitRect`, `boxToRect`) |
| `components/voice-sheet.tsx` | 파형, 받아쓰기, 적용 내역, 입력창 |
| `components/ui.tsx`, `icon.tsx` | 버튼·헤더·필·아이콘 (디자인 토큰 사용) |
| `lib/color-matrix.ts` | `Adjustments` → 4×5 컬러 매트릭스, 병합, 한국어 요약 |
| `lib/photo.ts` | 작업 해상도 변환 (`WORKING_MAX = 1536`) |
| `lib/api.ts` | 서버 클라이언트 |
| `theme/tokens.ts` | 디자인 토큰 |

### 렌더링 파이프라인 (`PhotoCanvas`)

1. `base`(base64) → `Skia.Image.MakeImageFromEncoded`
2. 이미지 전체를 `toMatrix(global)` 로 그림
3. 각 영역마다 `Group clip=boxRect` 안에서 `toMatrix(global + region)` 로 한 번 더 그림
4. `vignette > 0` 이면 RadialGradient 오버레이
5. 저장: `canvasRef.makeImageSnapshot().encodeToBase64()` → `File(Paths.cache)` → `Asset.create`

컬러 매트릭스 구성 순서: 노출(2^EV 스케일) → 그림자(오프셋+/기울기−) → 하이라이트(기울기) → 대비(0.5 중심) → 채도(Rec.709 휘도) → 색온도/틴트(R·B / G 오프셋). 하이라이트/그림자는 선형 근사.

### 좌표 변환
`fitRect(imgW, imgH, boxW, boxH)` 로 contain 영역을 구하고, `boxToRect(region, fit)` 로 0–1000 박스를 화면 좌표로. 사각형 도구는 역변환(`norm`).

## 5. 환경변수

`apps/server/.env` (커밋 금지, 예시는 `.env.example`)

| 키 | 기본값 | 설명 |
|---|---|---|
| `LLM_PROVIDER` | `gemini` | 공급자 선택 |
| `GEMINI_API_KEY` | — | **비밀** |
| `GEMINI_MODEL_TRANSCRIBE` | `gemini-3.5-transcribe` | |
| `GEMINI_MODEL_REASONING` | `gemini-3.8-flash` | |
| `GEMINI_MODEL_IMAGE_EDIT` | `gemini-3.1-flash-image` | |
| `PORT` | `8787` | |
| `APP_TOKEN` | `dev-local-token` | 개발용 공유 토큰 (비어 있으면 검사 생략) |

`apps/mobile/.env` — `EXPO_PUBLIC_*` 는 번들에 포함되므로 비밀을 넣지 않는다.

| 키 | 설명 |
|---|---|
| `EXPO_PUBLIC_API_URL` | 서버 주소. 실기기에서는 Mac의 LAN IP |
| `EXPO_PUBLIC_APP_TOKEN` | 서버 `APP_TOKEN` 과 동일 |

## 6. 권한 (app.json 플러그인)
카메라(`expo-camera`), 마이크(`expo-audio`, `expo-camera` recordAudioAndroid), 사진 읽기(`expo-image-picker`), 사진 저장(`expo-media-library`). 번들 ID `com.voicelens.app`.
