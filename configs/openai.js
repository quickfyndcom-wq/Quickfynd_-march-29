import OpenAI from "openai";

// Lazy initialize OpenAI to avoid build-time crashes when env vars are missing
let _openai = null;

const resolveOpenAIKey = () => {
  return process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY || "";
};

export function isOpenAIConfigured() {
  return Boolean(resolveOpenAIKey());
}

export function ensureOpenAI() {
  if (_openai) return _openai;
  const OPENAI_API_KEY = resolveOpenAIKey();
  const { OPENAI_BASE_URL } = process.env;
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI is not configured");
  }
  _openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
    baseURL: OPENAI_BASE_URL,
  });
  return _openai;
}

// Default-like named export that defers initialization until first use
export const openai = new Proxy({}, {
  get(_target, prop) {
    const client = ensureOpenAI();
    // @ts-ignore dynamic access
    return client[prop];
  }
});

