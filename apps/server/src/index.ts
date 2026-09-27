import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { z } from 'zod';
import { config } from './config.js';
import { getProvider, Region } from './llm/index.js';

const Media = z.object({ data: z.string().min(1), mimeType: z.string().min(1) });

const app = new Hono();
app.use(logger());
// 웹 앱(Expo web)에서 호출 허용. 운영 도메인은 WEB_ORIGINS 에 콤마로 추가.
// 개발 모드에서는 localhost·사설망 IP(와이파이가 바뀌어 IP 가 달라져도) 를 모두 허용한다.
const DEV_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;
app.use(
  '/api/*',
  cors({
    origin: (origin) =>
      config.webOrigins.includes(origin) || (process.env.NODE_ENV !== 'production' && DEV_ORIGIN.test(origin)) ? origin : null,
    allowHeaders: ['content-type', 'x-app-token'],
    allowMethods: ['POST', 'OPTIONS'],
  }),
);
app.use('/api/*', bodyLimit({ maxSize: 20 * 1024 * 1024 }));
app.use('/api/*', async (c, next) => {
  if (config.appToken && c.req.header('x-app-token') !== config.appToken) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  await next();
});

app.onError((err, c) => {
  console.error(err);
  const status = err instanceof z.ZodError ? 400 : 500;
  return c.json({ error: err.message }, status);
});

app.get('/health', (c) => c.json({ ok: true, provider: config.provider, models: config.gemini.models }));

/** 음성 → 텍스트 */
app.post('/api/transcribe', async (c) => {
  const { audio } = z.object({ audio: Media }).parse(await c.req.json());
  const text = await getProvider().transcribe(audio);
  return c.json({ text });
});

/** 텍스트 명령 (+ 이미지, 선택 영역) → 실행 계획 */
app.post('/api/plan', async (c) => {
  const body = z
    .object({ text: z.string().min(1), image: Media.optional(), selectedRegion: Region.optional() })
    .parse(await c.req.json());
  return c.json(await getProvider().planCommand(body));
});

/** 음성 한 번에: 받아쓰기 + 계획 */
app.post('/api/voice-command', async (c) => {
  const body = z
    .object({ audio: Media, image: Media.optional(), selectedRegion: Region.optional() })
    .parse(await c.req.json());
  const llm = getProvider();
  const text = await llm.transcribe(body.audio);
  if (!text) return c.json({ text, plan: null });
  const plan = await llm.planCommand({ text, image: body.image, selectedRegion: body.selectedRegion });
  return c.json({ text, plan });
});

/** 말로 영역 찾기 ("왼쪽 나무") */
app.post('/api/detect', async (c) => {
  const body = z.object({ image: Media, query: z.string().min(1) }).parse(await c.req.json());
  return c.json({ regions: await getProvider().detectRegions(body) });
});

/** 생성형 편집 (객체 제거, 스타일 변경 등) */
app.post('/api/edit', async (c) => {
  const body = z
    .object({ image: Media, instruction: z.string().min(1), region: Region.optional() })
    .parse(await c.req.json());
  return c.json({ image: await getProvider().editImage(body) });
});

serve({ fetch: app.fetch, port: config.port, hostname: '0.0.0.0' }, (info) => {
  console.log(`VoiceLens server on http://localhost:${info.port} (provider: ${config.provider})`);
});
