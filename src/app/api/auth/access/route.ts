import { NextResponse } from 'next/server';
import { authEnv, validOrigin, limit, newToken, tokenHash } from '@/lib/security/auth';
import { hashPassword, verifyPassword } from '@/lib/security/password';
import { verifyTurnstile } from '@/lib/security/turnstile';

export const dynamic = 'force-dynamic';
const bad = (message: string, status = 400) => NextResponse.json({ error: message }, { status, headers: {'Cache-Control':'no-store'} });
export async function POST(req: Request) {
  try {
    const env = await authEnv();
    if (!validOrigin(req, env)) return bad('Invalid request origin.', 403);
    if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return bad('Invalid request.');
    const ip = req.headers.get('cf-connecting-ip');
    if (!ip || ip.length > 64) return bad('Connection could not be verified.', 403);
    const raw = await req.text(); if (raw.length > 8192) return bad('Request too large.', 413);
    let data: Record<string, unknown>; try { data = JSON.parse(raw); } catch { return bad('Invalid request.'); }
    const { action, password, token } = data; const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
    if ((action !== 'login' && action !== 'register') || typeof password !== 'string' || typeof token !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad('Enter a valid email and password.');
    if (!await limit(env, `ip:${ip}`, 30) || !await limit(env, `email:${email}`, 10)) return bad('Too many attempts. Try again later.', 429);
    const check = await verifyTurnstile({ token, secret:env.TURNSTILE_SECRET_KEY, expectedHostname:new URL(env.AUTH_ORIGIN).hostname, expectedAction:action, remoteIp:ip });
    if (!check.ok) return bad('Security check failed. Please try again.', 403);
    if (password.length < 12 || new TextEncoder().encode(password).length > 1024) return bad('Password must be at least 12 characters and no more than 1024 bytes.');
    let userId: string;
    if (action === 'register') {
      userId = crypto.randomUUID();
      const hashed = await hashPassword(password);
      try { await env.DB.prepare(`INSERT INTO users (id,email,password_hash,role) VALUES (?,?,?,'viewer')`).bind(userId,email,hashed).run(); }
      catch { return bad('Unable to create account. If you already have an account, log in.', 400); }
    } else {
      const user = await env.DB.prepare('SELECT id,password_hash,status FROM users WHERE email=?').bind(email).first<{id:string;password_hash:string;status:string}>();
      if (!user || user.status !== 'active' || !await verifyPassword(password,user.password_hash)) return bad('Email or password is incorrect.', 401);
      userId = user.id;
    }
    const session = newToken(); const expires = Math.floor(Date.now()/1000)+7*86400;
    await env.DB.prepare('INSERT INTO auth_sessions (id,user_id,token_hash,expires_at) VALUES (?,?,?,?)').bind(crypto.randomUUID(),userId,await tokenHash(session),expires).run();
    const res = NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
    res.cookies.set('__Host-viewpoint_session',session,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:7*86400});
    return res;
  } catch (error) { console.error('Authentication unavailable', error instanceof Error ? error.message : 'unknown'); return bad('Authentication is unavailable. Please try again later.', 503); }
}
