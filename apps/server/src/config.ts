function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`환경변수 ${name} 가 설정되지 않았습니다 (.env 확인)`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 8787),
  appToken: process.env.APP_TOKEN ?? '',
  provider: process.env.LLM_PROVIDER ?? 'gemini',
  webOrigins: (process.env.WEB_ORIGINS ?? 'http://localhost:8081').split(',').map((o) => o.trim()).filter(Boolean),
  gemini: {
    get apiKey() {
      return required('GEMINI_API_KEY');
    },
    models: {
      transcribe: process.env.GEMINI_MODEL_TRANSCRIBE ?? 'gemini-3.5-transcribe',
      reasoning: process.env.GEMINI_MODEL_REASONING ?? 'gemini-3.8-flash',
      imageEdit: process.env.GEMINI_MODEL_IMAGE_EDIT ?? 'gemini-3.1-flash-image',
    },
  },
};
