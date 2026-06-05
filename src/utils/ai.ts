import type { AiConfig } from '../types';

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

export async function suggestEngagement(
  opts: SuggestOptions,
): Promise<{ title: string; description: string } | null> {
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
      const apiKey = config.copilot.apiKey ?? '';
      if (!apiKey) {
        console.warn(
          '[AI] Copilot backend requires an API key. Set copilot.apiKey in public/ai-config.json.',
        );
        return null;
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
      // Custom / Ollama-style endpoint (may use chat completions or generate format)
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
    return JSON.parse(match[0]) as { title: string; description: string };
  } catch (e) {
    console.warn('[AI] Suggestion failed', e);
    return null;
  }
}
