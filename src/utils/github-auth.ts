/**
 * GitHub OAuth Device Flow helpers and token cache.
 *
 * To use the device flow you need a GitHub OAuth App with
 * "Device flow" enabled. Set `copilot.clientId` in public/ai-config.json
 * to your app's client ID.
 */

export interface DeviceFlowStart {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}

const GH_BASE = 'https://github.com';
const TOKEN_STORAGE_KEY = 'gh_access_token';

// ── Token cache (localStorage) ────────────────────────────────────────────────

export function getCachedToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setCachedToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearCachedToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

// ── Auto-detect from GitHub CLI ───────────────────────────────────────────────

/**
 * Reads the token that `gh auth login` stored for github.com.
 * Only available inside Electron (requires `window.electronAPI.detectGitHubToken`).
 */
export async function detectCliToken(): Promise<string | null> {
  if (!window.electronAPI?.detectGitHubToken) return null;
  try {
    return await window.electronAPI.detectGitHubToken();
  } catch {
    return null;
  }
}

// ── Device flow ───────────────────────────────────────────────────────────────

export async function startDeviceFlow(clientId: string): Promise<DeviceFlowStart> {
  const resp = await fetch(`${GH_BASE}/login/device/code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: clientId }),
  });
  if (!resp.ok) throw new Error(`GitHub device flow request failed: HTTP ${resp.status}`);
  const data = await resp.json() as {
    device_code: string;
    user_code: string;
    verification_uri: string;
    expires_in: number;
    interval: number;
  };
  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUri: data.verification_uri,
    expiresIn: data.expires_in,
    interval: data.interval ?? 5,
  };
}

/**
 * Polls GitHub until the user has authorized the device, the code expires, or
 * the caller aborts via `signal`.  Returns the access token on success or
 * `null` on timeout / denial / abort.
 */
export async function pollForToken(
  clientId: string,
  deviceCode: string,
  interval: number,
  signal: AbortSignal,
): Promise<string | null> {
  let pollInterval = interval;
  while (!signal.aborted) {
    await new Promise(r => setTimeout(r, pollInterval * 1000));
    if (signal.aborted) return null;
    try {
      const resp = await fetch(`${GH_BASE}/login/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        }),
      });
      if (!resp.ok) continue;
      const data = await resp.json() as { access_token?: string; error?: string };
      if (data.access_token) return data.access_token;
      if (data.error === 'slow_down') { pollInterval += 5; continue; }
      if (data.error === 'authorization_pending') continue;
      return null; // expired, denied, or unexpected error
    } catch {
      // transient network error — keep polling
    }
  }
  return null;
}

/** Open a URL in the default browser (Electron) or a new tab (browser). */
export function openBrowser(url: string): void {
  if (window.electronAPI?.openExternalUrl) {
    window.electronAPI.openExternalUrl(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
