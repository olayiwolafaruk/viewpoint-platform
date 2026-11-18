import type { D1Database } from '@cloudflare/workers-types';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { cookies } from 'next/headers';

export type AuthEnv = { DB: D1Database; AUTH_ORIGIN: string; AUTH_RATE_SECRET: string; TURNSTILE_SECRET_KEY: string; TURNSTILE_SITE_KEY: string };
export async function authEnv(): Promise<AuthEnv> {
  const { env } = await getCloudflareContext({ async: true });
  const e = env as unknown as AuthEnv;
  if (!e.DB || !e.AUTH_ORIGIN || !e.AUTH_RATE_SECRET || e.AUTH_RATE_SECRET.length < 32 || !e.TURNSTILE_SECRET_KEY || !e.TURNSTILE_SITE_KEY) throw new Error('Authentication is not configured');
  const origin = new URL(e.AUTH_ORIGIN);
  if (origin.origin !== e.AUTH_ORIGIN || (origin.protocol !== 'https:' && origin.hostname !== 'localhost')) throw new Error('Invalid authentication origin');
  return e;
}
export function validOrigin(req: Request, env: AuthEnv): boolean { return req.headers.get('origin') === env.AUTH_ORIGIN; }
export function hex(data: ArrayBuffer): string { return Array.from(new Uint8Array(data), b => b.toString(16).padStart(2, '0')).join(''); }
export async function tokenHash(token: string): Promise<string> { return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))); }
export function newToken(): string { return Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2,'0')).join(''); }
export async function keyedHash(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
}
export async function limit(env: AuthEnv, key: string, max: number): Promise<boolean> {
  const now = Math.floor(Date.now()/1000); const hash = await keyedHash(env.AUTH_RATE_SECRET, key);
  const row = await env.DB.prepare(`INSERT INTO auth_rate_limits (key,window_start,attempts) VALUES (?, ?, 1)
    ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN window_start <= ? THEN 1 ELSE attempts+1 END,
    window_start=CASE WHEN window_start <= ? THEN ? ELSE window_start END RETURNING attempts`)
    .bind(hash, now, now-900, now-900, now).first<{attempts:number}>();
  return !!row && row.attempts <= max;
}
export async function currentUser(env: AuthEnv) {
  const token = (await cookies()).get('__Host-viewpoint_session')?.value;
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  return env.DB.prepare(`SELECT u.id, u.email, u.role, u.wallet_balance_kobo FROM auth_sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at > unixepoch() AND u.status='active' LIMIT 1`)
    .bind(await tokenHash(token)).first<{id:string;email:string;role:string;wallet_balance_kobo:number}>();
}
