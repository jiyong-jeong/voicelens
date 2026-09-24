import {
  Canvas, ColorMatrix, Group, Image, RadialGradient, Rect, Skia, vec, type CanvasRef, type SkImage,
} from '@shopify/react-native-skia';
import { useMemo, type RefObject } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { mergeAdjustments, toMatrix } from '@/lib/color-matrix';
import type { Media, Region } from '@/lib/types';
import type { EditState } from '@/state/session';
import { colors } from '@/theme/tokens';

export function useSkImage(media?: Media): SkImage | null {
  return useMemo(() => {
    if (!media) return null;
    return Skia.Image.MakeImageFromEncoded(Skia.Data.fromBase64(media.data));
  }, [media]);
}

/** 이미지를 박스 안에 contain 으로 맞췄을 때의 실제 사각형 */
export function fitRect(imgW: number, imgH: number, boxW: number, boxH: number) {
  const s = Math.min(boxW / imgW, boxH / imgH);
  const width = imgW * s;
  const height = imgH * s;
  return { x: (boxW - width) / 2, y: (boxH - height) / 2, width, height };
}

/** 0–1000 정규화 박스 → 캔버스 좌표 */
export function boxToRect(r: Region, fit: ReturnType<typeof fitRect>) {
  const [ymin, xmin, ymax, xmax] = r.box;
  return {
    x: fit.x + (xmin / 1000) * fit.width,
    y: fit.y + (ymin / 1000) * fit.height,
    width: ((xmax - xmin) / 1000) * fit.width,
    height: ((ymax - ymin) / 1000) * fit.height,
  };
}

interface Props {
  state: EditState;
  width: number;
  height: number;
  /** false면 보정 없이 원본만 (비교 화면용) */
  applyEdits?: boolean;
  /** 영역 오버레이 표시 */
  outlines?: Region[];
  highlight?: Region | null;
  canvasRef?: RefObject<CanvasRef | null>;
}

/**
 * 비파괴 렌더링: 기준 이미지 위에 전역 ColorMatrix, 그 위에 영역별로 clip 후
 * (전역 ∘ 영역) ColorMatrix 를 한 번 더 그린다. 픽셀은 저장 시에만 확정된다.
 */
export function PhotoCanvas({ state, width, height, applyEdits = true, outlines = [], highlight, canvasRef }: Props) {
  const image = useSkImage(state.base);
  const fit = fitRect(state.width, state.height, width, height);
  const globalM = useMemo(() => toMatrix(applyEdits ? state.global : {}), [state.global, applyEdits]);
  const vignette = applyEdits ? state.global.vignette ?? 0 : 0;

  return (
    <View style={{ width, height }}>
      <Canvas ref={canvasRef} style={{ width, height }}>
        {image && (
          <>
            <Image image={image} {...fit} fit="contain">
              <ColorMatrix matrix={globalM} />
            </Image>
            {applyEdits &&
              state.regions.map(({ region, adjustments }) => {
                const r = boxToRect(region, fit);
                const m = toMatrix(mergeAdjustments(state.global, adjustments));
                return (
                  <Group key={region.label} clip={Skia.XYWHRect(r.x, r.y, r.width, r.height)}>
                    <Image image={image} {...fit} fit="contain">
                      <ColorMatrix matrix={m} />
                    </Image>
                  </Group>
                );
              })}
            {vignette > 0 && (
              <Rect {...fit}>
                <RadialGradient
                  c={vec(fit.x + fit.width / 2, fit.y + fit.height / 2)}
                  r={Math.max(fit.width, fit.height) * 0.75}
                  colors={['rgba(0,0,0,0)', `rgba(0,0,0,${Math.min(vignette, 100) / 110})`]}
                  positions={[0.45, 1]}
                />
              </Rect>
            )}
          </>
        )}
      </Canvas>
      {outlines.map((r) => {
        const rect = boxToRect(r, fit);
        const on = highlight?.label === r.label;
        return (
          <View
            key={r.label}
            pointerEvents="none"
            style={[
              st.outline,
              { left: rect.x, top: rect.y, width: rect.width, height: rect.height },
              on && { borderStyle: 'solid', borderWidth: 2, backgroundColor: 'rgba(127,200,255,.22)' },
            ]}>
            <View style={st.tag}>
              <Text style={st.tagText}>{r.label}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  outline: { position: 'absolute', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.region, borderRadius: 12 },
  tag: { position: 'absolute', left: 8, top: 8, backgroundColor: colors.region, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  tagText: { color: colors.onRegion, fontSize: 12, fontWeight: '600' },
});
