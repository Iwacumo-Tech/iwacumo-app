import { createOpenAI } from "@ai-sdk/openai";

const SUPPORTED_PROVIDERS = ["openai", "openrouter"] as const;
export type AIProvider = (typeof SUPPORTED_PROVIDERS)[number];

const AI_CHAPTER_DEFAULT_PROVIDER: AIProvider = "openai";
const AI_CHAPTER_DEFAULT_MODEL = "gpt-4o";

const providerCache = new Map<string, ReturnType<typeof createOpenAI>>();

function getOpenAIProvider(apiKey: string) {
  const key = `openai:${apiKey}`;
  if (!providerCache.has(key)) {
    providerCache.set(key, createOpenAI({ apiKey }));
  }
  return providerCache.get(key)!;
}

function getOpenRouterProvider(apiKey: string) {
  const key = `openrouter:${apiKey}`;
  if (!providerCache.has(key)) {
    providerCache.set(
      key,
      createOpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey,
        headers: {
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8090",
          "X-Title": "Revelation Book Platform",
        },
      }),
    );
  }
  return providerCache.get(key)!;
}

export function getAIChapterProvider(config?: {
  provider?: string;
  apiKey?: string;
}) {
  const provider = (config?.provider || process.env.AI_CHAPTER_PROVIDER || AI_CHAPTER_DEFAULT_PROVIDER) as AIProvider;

  console.log(`[AI] Provider requested: ${provider}`);

  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    console.error(`[AI] Unsupported provider: "${provider}". Supported: ${SUPPORTED_PROVIDERS.join(", ")}`);
    throw new Error(`Unsupported AI provider: ${provider}. Supported: ${SUPPORTED_PROVIDERS.join(", ")}`);
  }

  const envVarName = provider === "openrouter" ? "OPENROUTER_API_KEY" : "OPENAI_API_KEY";
  const apiKey = config?.apiKey || process.env[envVarName];

  console.log(`[AI] Env ${envVarName}: ${apiKey ? `present (length: ${apiKey.length})` : "MISSING"}`);

  if (!apiKey) {
    console.error(`[AI] Missing ${envVarName} for provider ${provider}`);
    throw new Error(`Missing API key for ${provider}. Set ${envVarName} environment variable.`);
  }

  if (provider === "openrouter") {
    return getOpenRouterProvider(apiKey);
  }

  return getOpenAIProvider(apiKey);
}

export function getAIConfig(): {
  enabled: boolean;
  provider: AIProvider;
  model: string;
} {
  return {
    enabled: process.env.AI_CHAPTER_ENABLED === "true",
    provider: (process.env.AI_CHAPTER_PROVIDER as AIProvider) || AI_CHAPTER_DEFAULT_PROVIDER,
    model: process.env.AI_CHAPTER_MODEL || AI_CHAPTER_DEFAULT_MODEL,
  };
}

export function getAIModel(config?: { model?: string }) {
  return config?.model || process.env.AI_CHAPTER_MODEL || AI_CHAPTER_DEFAULT_MODEL;
}
