/** Gemini 연동 스모크 테스트: npm run smoke */
import { readFileSync, writeFileSync } from 'node:fs';
import { getProvider } from '../src/llm/index.js';

const fx = (f: string) => new URL(`./fixtures/${f}`, import.meta.url);
const image = { data: readFileSync(fx('photo.jpg')).toString('base64'), mimeType: 'image/jpeg' };
const audio = { data: readFileSync(fx('voice.m4a')).toString('base64'), mimeType: 'audio/mp4' };
const llm = getProvider();

const step = async <T>(name: string, fn: () => Promise<T>) => {
  const t = Date.now();
  try {
    const r = await fn();
    console.log(`✔ ${name} (${Date.now() - t}ms)`, typeof r === 'string' ? r : JSON.stringify(r).slice(0, 400));
    return r;
  } catch (e) {
    console.error(`✘ ${name}:`, (e as Error).message);
  }
};

const text = await step('transcribe', () => llm.transcribe(audio));
await step('plan', () => llm.planCommand({ text: text || '하늘을 더 파랗게', image }));
await step('detect', () => llm.detectRegions({ image, query: '인물' }));
const edited = await step('edit', () => llm.editImage({ image, instruction: 'Make the colors warmer, like golden hour.' }));
if (edited) writeFileSync(fx('edited.png'), Buffer.from(edited.data, 'base64'));
