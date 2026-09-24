# 기술 스택

> 기준일: 2026-09-24. 버전은 `package.json` 이 원본이다.

## 한눈에 보기

| 레이어 | 선택 | 버전 | 이유 |
|---|---|---|---|
| 모바일 프레임워크 | Expo + React Native + TypeScript | Expo SDK 57, RN 0.86, React 19.2 | iOS/Android 동시 개발, 카메라·오디오·미디어 모듈이 공식 제공됨, OTA 업데이트 |
| 라우팅 | expo-router | 57 | 파일 기반 라우팅 (`src/app/*`) |
| 카메라 | expo-camera (`CameraView`) | 57 | 촬영, 플래시, 권한 훅 |
| 음성 녹음 | expo-audio (`useAudioRecorder`) | 57 | m4a/AAC 녹음, 미터링(파형) |
| 이미지 렌더링/보정 | @shopify/react-native-skia | 2.6 | GPU 컬러 매트릭스, 영역 clip, 스냅샷 → 실시간 비파괴 보정 |
| 이미지 전처리 | expo-image-manipulator | 57 | 작업 해상도(1536px)로 리사이즈 + base64 |
| 파일/저장 | expo-file-system (`File`, `Paths`), expo-media-library (`Asset.create`) | 57 | 새 객체형 API 사용 (레거시 함수는 런타임 에러) |
| 아이콘 | react-native-svg | 15.x | 디자인 캔버스의 스트로크 아이콘 패스를 그대로 사용 |
| API 서버 | Node 22 + Hono + @hono/node-server | Hono 4.13 | 가볍고 빠름, 추후 Cloudflare Workers/Cloud Run 이전 용이 |
| LLM SDK | @google/genai | 2.24 | Gemini 공식 SDK, `responseJsonSchema` 구조화 출력 |
| 스키마 검증 | zod v4 | 4.6 | 요청 검증 + `z.toJSONSchema()` 로 LLM 출력 스키마 생성 (단일 원본) |
| 실행 | tsx | 4.23 | TS 직접 실행, `--env-file` 로 .env 로드 |

## LLM 선정

### 왜 Gemini 로 시작하나
- 한 공급자 안에서 **음성 인식 · 멀티모달 이해 · 공간 인식(바운딩 박스) · 이미지 편집**을 모두 제공한다. 이 앱에 필요한 네 가지 능력을 한 키로 해결.
- 공간 인식이 네이티브 포맷(`[ymin, xmin, ymax, xmax]`, 0–1000 정규화)을 가져 "왼쪽 나무만" 같은 영역 지정이 추가 모델 없이 된다.

### 역할별 모델 (이 키로 사용 가능한 모델 목록을 조회해 선정)

| 역할 | 환경변수 | 기본 모델 | 비고 |
|---|---|---|---|
| 받아쓰기 (STT) | `GEMINI_MODEL_TRANSCRIBE` | `gemini-3.5-transcribe` | 전용 받아쓰기 모델. 결과가 `text` 가 아니라 **`audioTranscription` 파트**로 온다 (코드에서 처리함) |
| 명령 해석 + 영역 감지 | `GEMINI_MODEL_REASONING` | `gemini-3.8-flash` | 구조화 JSON 출력, 이미지 이해, 박스 좌표 |
| 생성형 편집 | `GEMINI_MODEL_IMAGE_EDIT` | `gemini-3.1-flash-image` | 객체 제거·스타일 변경 등. 고품질 대안: `gemini-3-pro-image` |

측정된 지연 시간 (2026-09-24 스모크 테스트, 1024px 이미지):
받아쓰기 ~2.5–2.9s · 명령 해석 ~4.5–5.8s · 영역 감지 ~3.7–4.7s · 이미지 편집 ~9.7–9.9s

### 추후 검토할 후보
- **실시간 음성**: `gemini-3.5-transcribe-live`, `gemini-3.8-live` (bidi 스트리밍) — 말하는 동안 자막, 발화 종료 자동 감지.
- **다른 공급자**: Claude (명령 해석 품질/안전성), OpenAI 등. `LLMProvider` 인터페이스만 구현하면 된다. 역할별로 서로 다른 공급자를 섞는 구성도 가능하도록 레지스트리를 역할 단위로 쪼갤 수 있다 (ISSUES.md 참고).

## 선택하지 않은 것
- **Flutter / 네이티브**: 개발 속도와 웹 호환(추후 웹 편집기) 고려해 RN 선택.
- **앱에서 Gemini 직접 호출**: 키가 번들에 노출된다. 반드시 서버 프록시 경유.
- **디바이스 STT (iOS Speech / Android SpeechRecognizer)**: 한국어 품질과 플랫폼 간 일관성 때문에 서버 STT로 시작. 오프라인/저지연이 필요하면 fallback 으로 추가 가능.
