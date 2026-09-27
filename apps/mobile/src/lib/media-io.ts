// 네이티브 구현. 웹은 media-io.web.ts (Metro 가 플랫폼별로 자동 선택)
import { File, Paths } from 'expo-file-system';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import { Share } from 'react-native';
import type { Media } from './types';

export async function readAsMedia(uri: string, fallbackMime: string): Promise<Media> {
  return { data: await new File(uri).base64(), mimeType: fallbackMime };
}

function writeTemp(jpegBase64: string) {
  const file = new File(Paths.cache, `voicelens-${Date.now()}.jpg`);
  file.write(jpegBase64, { encoding: 'base64' });
  return file.uri;
}

/** 사진 보관함에 저장 */
export async function saveImage(jpegBase64: string): Promise<string> {
  const perm = await requestPermissionsAsync(true);
  if (!perm.granted) throw new Error('사진 보관함 권한이 필요해요');
  const uri = writeTemp(jpegBase64);
  await Asset.create(uri);
  return '앨범에 저장했어요';
}

export async function shareImage(jpegBase64: string): Promise<void> {
  await Share.share({ url: writeTemp(jpegBase64) });
}
