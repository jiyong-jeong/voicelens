import { config } from '../config.js';
import { createGeminiProvider } from './gemini.js';
import type { LLMProvider } from './types.js';

/** 공급자 레지스트리 — 새 LLM은 여기에 한 줄 추가 */
const registry: Record<string, () => LLMProvider> = {
  gemini: createGeminiProvider,
  // claude: createClaudeProvider,
  // openai: createOpenAIProvider,
};

let instance: LLMProvider | undefined;

export function getProvider(): LLMProvider {
  if (instance) return instance;
  const factory = registry[config.provider];
  if (!factory) throw new Error(`알 수 없는 LLM_PROVIDER: ${config.provider}`);
  return (instance = factory());
}

export * from './schema.js';
export type * from './types.js';
