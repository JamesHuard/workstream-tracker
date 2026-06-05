import type { AiConfig } from '../types';

const DEFAULT_CONFIG: AiConfig = {
  backend: 'copilot',
  copilot: { model: 'gpt-4o' },
  custom: { endpoint: 'http://localhost:11434/api/generate', model: 'llama3' },
};

let cached: AiConfig | null = null;

export async function loadAiConfig(): Promise<AiConfig> {
  if (cached) return cached;
  try {
    const resp = await fetch('/ai-config.json');
    if (!resp.ok) throw new Error('Not found');
    cached = (await resp.json()) as AiConfig;
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
    if (config.backend === 'copilot') {
      // Use GitHub Copilot via the VS Code extension API if available,
      // or fall back to a no-op with a helpful message.
      console.info(
        '[AI] Copilot backend: integrate via VS Code extension or GitHub Copilot API.',
        prompt,
      );
      return null;
    }

    // Custom / Ollama-style endpoint
    const resp = await fetch(config.custom.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: config.custom.model, prompt, stream: false }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const text: string = data.response ?? data.choices?.[0]?.message?.content ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as { title: string; description: string };
  } catch (e) {
    console.warn('[AI] Suggestion failed', e);
    return null;
  }
}
