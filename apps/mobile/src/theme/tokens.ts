/** Claude Design 캔버스(VoiceLens 앱 디자인)의 토큰과 1:1 대응 */
export const colors = {
  ground: '#0E0D0C',
  surface: '#1A1816',
  surface2: '#26231F',
  line: '#3A3530',
  text: '#F3EFE8',
  textSoft: '#D9D2C7',
  muted: '#A89F94',
  accent: '#FF9A4D', // safelight amber — 주요 액션, 음성
  onAccent: '#1A0F06',
  region: '#7FC8FF', // AI/사용자 선택 영역
  onRegion: '#06121E',
  danger: '#FF6B5E',
} as const;

export const radius = { sm: 12, md: 14, lg: 16, xl: 20, sheet: 24, pill: 999 } as const;

/** 디자인: 제목 Instrument Serif, 본문 IBM Plex Sans KR, 수치 IBM Plex Mono. 폰트 로딩 전까지 시스템 폰트로 대체 */
export const fonts = {
  display: undefined as string | undefined,
  body: undefined as string | undefined,
  mono: 'Menlo',
};

export const hit = 44;
