# VoiceLens — 개발 컨텍스트

말로 찍고, 말로 보정하는 사진 앱. 사용자의 음성을 텍스트로 바꾸고, LLM이 그 텍스트를 **편집 계획(JSON)** 으로 해석해 사진에 적용한다.

작업 전에 필요한 문서를 먼저 읽을 것:

| 문서 | 내용 |
|---|---|
| [docs/TECH_STACK.md](docs/TECH_STACK.md) | 기술 스택과 LLM/모델 선정 근거 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 전체 구조, 데이터 흐름, 설계 원칙 |
| [docs/SYSTEM.md](docs/SYSTEM.md) | API 명세, 스키마, 렌더링 파이프라인, 환경변수, 파일 맵 |
| [docs/DESIGN.md](docs/DESIGN.md) | Claude Design 캔버스, 디자인 토큰, 화면 구성 |
| [docs/ISSUES.md](docs/ISSUES.md) | 알려진 이슈, 기술 부채, 보안 과제, 로드맵 |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | 로컬 실행, 테스트, 디버깅 |

## 반드시 지킬 규칙

- **LLM 키는 서버(`apps/server/.env`)에만 둔다.** 앱 번들(`EXPO_PUBLIC_*`)에 절대 넣지 않는다.
- LLM 호출은 `apps/server/src/llm/` 의 `LLMProvider` 인터페이스를 통해서만 한다. 새 공급자는 인터페이스 구현 + `llm/index.ts` 레지스트리 등록.
- 편집 계획 스키마는 `apps/server/src/llm/schema.ts`(zod) 가 원본이고 `apps/mobile/src/lib/types.ts` 가 미러다. **둘을 함께 수정**한다.
- 파라메트릭 보정(노출·색 등)은 디바이스에서 비파괴로 처리한다. 생성형 모델은 파라메트릭으로 불가능한 요청에만 쓴다 (비용·지연·원본 훼손).
- Expo SDK 57 / RN 0.86 — Expo API는 자주 바뀐다. 기억에 의존하지 말고 `apps/mobile/AGENTS.md` 의 지침대로 버전별 문서를 확인한다. 패키지는 `npx expo install` 로 추가.
- Node 22 사용 (`.nvmrc`). 시스템 기본 Node 21은 RN 0.86 엔진 조건을 만족하지 않는다.
- 모델 ID는 코드에 하드코딩하지 말고 `GEMINI_MODEL_*` 환경변수로 바꾼다.

## 빠른 명령

```bash
nvm use                  # Node 22
npm run server           # API 서버 (http://localhost:8787)
npm run mobile           # Expo 개발 서버
npm run smoke            # Gemini 연동 스모크 테스트
npm run typecheck        # 서버 + 앱 타입체크
```
