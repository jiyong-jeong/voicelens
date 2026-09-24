import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '@/theme/tokens';

/** 디자인 캔버스의 인라인 스트로크 아이콘과 동일한 패스 */
export type IconName = 'flash' | 'settings' | 'mic' | 'back' | 'undo' | 'compare' | 'close';

export function Icon({ name, size = 20, color = colors.text }: { name: IconName; size?: number; color?: string }) {
  const p = { stroke: color, strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'flash' && <Path d="M13 2 4 14h7l-1 8 9-12h-7z" {...p} />}
      {name === 'settings' && (
        <>
          <Circle cx={12} cy={12} r={3} {...p} />
          <Path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" {...p} />
        </>
      )}
      {name === 'mic' && (
        <>
          <Rect x={9} y={3} width={6} height={11} rx={3} {...p} />
          <Path d="M5 11a7 7 0 0 0 14 0M12 18v3" {...p} />
        </>
      )}
      {name === 'back' && <Path d="m15 5-7 7 7 7" {...p} />}
      {name === 'undo' && <Path d="M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3" {...p} />}
      {name === 'compare' && <Path d="m9 6-6 6 6 6M15 6l6 6-6 6" {...p} />}
      {name === 'close' && <Path d="M6 6l12 12M18 6 6 18" {...p} />}
    </Svg>
  );
}
