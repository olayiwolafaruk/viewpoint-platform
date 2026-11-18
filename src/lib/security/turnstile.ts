type TurnstileResponse = { success?: boolean; hostname?: string; action?: string; 'error-codes'?: string[] };
export type TurnstileVerification = { ok: true } | { ok: false; reason: 'invalid' | 'unavailable' };

// The token must be submitted by the browser and validated on the server, once.
// expectedHostname and expectedAction are server configuration, never client input.
export async function verifyTurnstile(options: {
  token: string;
  secret: string;
  expectedHostname: string;
  expectedAction: string;
  remoteIp?: string;
}): Promise<TurnstileVerification> {
  if (!options.token || options.token.length > 2048 || !options.secret || !options.expectedHostname || !options.expectedAction) return { ok: false, reason: 'invalid' };
  const form = new URLSearchParams({ secret: options.secret, response: options.token });
  if (options.remoteIp) form.set('remoteip', options.remoteIp);
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', body: form, signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return { ok: false, reason: 'unavailable' };
    const result: TurnstileResponse = await response.json();
    if (result.success !== true || result.hostname !== options.expectedHostname || result.action !== options.expectedAction) return { ok: false, reason: 'invalid' };
    return { ok: true };
  } catch { return { ok: false, reason: 'unavailable' }; }
}
