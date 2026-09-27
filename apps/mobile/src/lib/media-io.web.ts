import type { Media } from './types';

/** blob:/data: URI → base64. 브라우저 녹음은 webm(Chrome/Firefox) 또는 mp4(Safari) */
export async function readAsMedia(uri: string, fallbackMime: string): Promise<Media> {
  const blob = await (await fetch(uri)).blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
  const mimeType = (blob.type || fallbackMime).split(';')[0];
  return { data: dataUrl.slice(dataUrl.indexOf(',') + 1), mimeType };
}

const toBlob = (b64: string) => new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: 'image/jpeg' });
const fileName = () => `voicelens-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.jpg`;

/** 브라우저 다운로드 */
export async function saveImage(jpegBase64: string): Promise<string> {
  const url = URL.createObjectURL(toBlob(jpegBase64));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName();
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return '다운로드했어요';
}

/** Web Share API(파일 공유 지원 브라우저) → 없으면 다운로드로 대체 */
export async function shareImage(jpegBase64: string): Promise<void> {
  const file = new File([toBlob(jpegBase64)], fileName(), { type: 'image/jpeg' });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'VoiceLens' });
    return;
  }
  await saveImage(jpegBase64);
}
