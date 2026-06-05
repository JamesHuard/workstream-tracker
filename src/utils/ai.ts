import type { AiConfig } from '../types';
import { getCachedToken, setCachedToken, detectCliToken } from './github-auth';

const DEFAULT_CONFIG: AiConfig = {
  backend: 'copilot',
  copilot: { model: 'gpt-4o' },
  openai: { model: 'gpt-4o', apiKey: '' },
  custom: { endpoint: 'http://localhost:11434/api/generate', model: 'llama3' },
};

let cached: AiConfig | null = null;

export async function loadAiConfig(): Promise<AiConfig> {
  if (cached) return cached;
  try {
    const resp = await fetch('/ai-config.json');
    if (!resp.ok) throw new Error('Not found');
    const loaded = (await resp.json()) as Partial<AiConfig>;
    // Merge with defaults so partial configs still work
    cached = { ...DEFAULT_CONFIG, ...loaded } as AiConfig;
    return cached;
  } catch {
    cached = DEFAULT_CONFIG;
    return cached;
  }
}

interface SuggestOptions {
  operationTitle: string;
  goals: string[];
  existingEngagements: string[];
}

/**
 * Result of a suggestion request.
 * - `success` — title/description populated from the model
 * - `needs-auth` — no token available; `clientId` is set when device flow is configured
 * - `null` — call succeeded but the model returned unusable output, or a
 *             non-auth error occurred (already logged to console)
 */
export type SuggestResult =
  | { kind: 'success'; title: string; description: string }
  | { kind: 'needs-auth'; clientId: string | null }
  | null;

/** Call an OpenAI-compatible chat completions endpoint. */
async function callChatCompletions(
  endpoint: string,
  model: string,
  userMessage: string,
  apiKey?: string,
): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = 'Bearer ' + apiKey;

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: userMessage }],
      temperature: 0.7,
    }),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`HTTP ${resp.status}${body ? `: ${body}` : ''}`);
  }
  const data = await resp.json();
  return (data.choices?.[0]?.message?.content as string | undefined) ?? '';
}

/** Resolve the best available token for the copilot backend. */
async function resolveCopilotToken(configKey: string | undefined): Promise<string | null> {
  if (configKey) return configKey;
  // 1. Previously stored token (device-flow or cached CLI token)
  const cached = getCachedToken();
  if (cached) return cached;
  // 2. Auto-detect from GitHub CLI hosts.yml
  const cli = await detectCliToken();
  if (cli) {
    setCachedToken(cli); // cache for subsequent calls
    return cli;
  }
  return null;
}

export async function suggestEngagement(opts: SuggestOptions): Promise<SuggestResult> {
  const config = await loadAiConfig();
  const prompt = [
    `Operation: ${opts.operationTitle}`,
    `Goals: ${opts.goals.join(', ') || 'none'}`,
    `Existing engagements: ${opts.existingEngagements.join(', ') || 'none'}`,
    '',
    'Suggest a new engagement for this operation. Reply ONLY with a JSON object: {"title":"...","description":"..."}',
  ].join('\n');

  try {
    let text = '';

    if (config.backend === 'copilot') {
      const endpoint =
        config.copilot.endpoint ?? 'https://api.githubcopilot.com/chat/completions';
      const apiKey = await resolveCopilotToken(config.copilot.apiKey);
      if (!apiKey) {
        return { kind: 'needs-auth', clientId: config.copilot.clientId ?? null };
      }
      text = await callChatCompletions(endpoint, config.copilot.model, prompt, apiKey);
    } else if (config.backend === 'openai') {
      const endpoint = config.openai.endpoint ?? 'https://api.openai.com/v1/chat/completions';
      if (!config.openai.apiKey) {
        console.warn(
          '[AI] OpenAI backend requires an API key. Set openai.apiKey in public/ai-config.json.',
        );
        return null;
      }
      text = await callChatCompletions(endpoint, config.openai.model, prompt, config.openai.apiKey);
    } else {
      // Custom / Ollama-style endpoint
      const resp = await fetch(config.custom.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: config.custom.model, prompt, stream: false }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      text = (data.response ?? data.choices?.[0]?.message?.content ?? '') as string;
    }

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return {
      kind: 'success',
      ...(JSON.parse(match[0]) as { title: string; description: string }),
    };
  } catch (e) {
    console.warn('[AI] Suggestion failed', e);
    return null;
  }
}
