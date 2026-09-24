# 디자인

## Claude Design 캔버스
- 링크: https://claude.ai/artifact/JCZaAyRHxDybZiVG1Gkzpn (비공개 — 공유하려면 캔버스 Share 메뉴에서)
- 아트보드 4개 (390×844, 모두 Play로 화면 이동 가능):
  `01 촬영` → `02 음성 편집` → `03 영역 선택` → `04 비교 · 저장`
- 캔버스의 Tweaks 에서 `accent`, `region` 색을 바꿔 볼 수 있음. 확정되면 `apps/mobile/src/theme/tokens.ts` 에 반영.
- 디자인 수정 → 앱 반영 흐름: 캔버스에서 수정 → 변경된 토큰/레이아웃을 `tokens.ts` 와 해당 화면(`src/app/*.tsx`)에 반영. 캔버스는 원본 디자인, 코드는 구현이다.

## 방향: "암실(darkroom)"
사진 앱이므로 UI가 사진보다 튀지 않도록 따뜻한 무채색 다크 그라운드를 쓰고, 암실 안전등 같은 앰버 한 색만 액션(음성·주요 버튼)에 사용한다. AI/선택 영역은 앰버와 구분되는 하늘색으로만 표시한다.

## 토큰 (`apps/mobile/src/theme/tokens.ts`)

| 토큰 | 값 | 용도 |
|---|---|---|
| `ground` | `#0E0D0C` | 배경 |
| `surface` / `surface2` | `#1A1816` / `#26231F` | 시트, 카드 |
| `line` | `#3A3530` | 테두리 |
| `text` / `textSoft` / `muted` | `#F3EFE8` / `#D9D2C7` / `#A89F94` | 본문 / 수치 / 보조 (배경 대비 4.5:1 이상) |
| `accent` / `onAccent` | `#FF9A4D` / `#1A0F06` | 음성·주요 액션 |
| `region` / `onRegion` | `#7FC8FF` / `#06121E` | 선택 영역 외곽선·라벨 |
| `radius` | 12 / 14 / 16 / 20 / 24(sheet) / pill | |
| 터치 타깃 | 44px 이상 | |

타이포: 제목 Instrument Serif, 본문 IBM Plex Sans KR, 수치 IBM Plex Mono.
→ 앱에는 아직 폰트 미적용(시스템 폰트 + Menlo). ISSUES.md D-1.

## 화면 구성과 구현 대응

| 디자인 아트보드 | 코드 | 구현 상태 |
|---|---|---|
| 01 촬영 | `src/app/index.tsx` | 셔터·갤러리·음성 촬영·플래시 ✅ / 3분할 격자, 1×·HDR 칩 ❌ |
| 02 음성 편집 | `src/app/editor.tsx`, `voice-sheet.tsx` | 파형·받아쓰기·적용 내역·영역 외곽선 ✅ |
| 03 영역 선택 | `src/app/region.tsx` | AI 자동 선택·사각형 ✅ / 브러시·지우개·브러시 크기 ❌ (마스크 필요, ISSUES T-1) |
| 04 비교·저장 | `src/app/result.tsx` | 분할 비교·이력·저장·공유·실행취소 ✅ |

## 원칙
- 음성이 1순위 입력이지만 **항상 텍스트 입력 대체 경로**를 둔다 (소음, 공공장소, 접근성).
- LLM이 무엇을 할지 **적용 내역을 수치로 보여준다** (신뢰, 미세조정 여지).
- 이모지 금지, 아이콘은 스트로크 SVG.
