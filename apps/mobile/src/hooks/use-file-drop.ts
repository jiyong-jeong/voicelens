import { useEffect, useRef, useState } from 'react';
import { isWeb } from '@/lib/layout';

export interface DroppedImage {
  uri: string; // data URI
  width: number;
  height: number;
}

function load(file: File): Promise<DroppedImage> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(r.error);
    r.onload = () => {
      const uri = r.result as string;
      const img = new window.Image();
      img.onload = () => resolve({ uri, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('이미지를 읽을 수 없어요 (HEIC 는 일부 브라우저만 지원)'));
      img.src = uri;
    };
    r.readAsDataURL(file);
  });
}

/** 웹: 창 어디에든 이미지 파일을 끌어다 놓으면 onDrop 호출 */
export function useFileDrop(onDrop: (img: DroppedImage) => void) {
  const [dragging, setDragging] = useState(false);
  const cb = useRef(onDrop);
  cb.current = onDrop;
  useEffect(() => {
    if (!isWeb) return;
    let depth = 0;
    const hasFile = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
    const enter = (e: DragEvent) => { if (hasFile(e)) { depth++; setDragging(true); } };
    const leave = () => { depth = Math.max(0, depth - 1); if (!depth) setDragging(false); };
    const over = (e: DragEvent) => { if (hasFile(e)) e.preventDefault(); };
    const drop = async (e: DragEvent) => {
      if (!hasFile(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      const file = Array.from(e.dataTransfer?.files ?? []).find((f) => f.type.startsWith('image/'));
      if (file) cb.current(await load(file));
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
    };
  }, []);
  return { dragging };
}
