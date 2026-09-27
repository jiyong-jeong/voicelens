import { Platform, useWindowDimensions } from 'react-native';

export const isWeb = Platform.OS === 'web';

/** 데스크톱 웹 레이아웃(이미지 + 오른쪽 패널) 기준 폭. 디자인 캔버스 W0–W4 */
export const WIDE_MIN = 960;

export function useWide() {
  const { width } = useWindowDimensions();
  return isWeb && width >= WIDE_MIN;
}
