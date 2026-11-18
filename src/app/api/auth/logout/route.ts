import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authEnv, tokenHash, validOrigin } from '@/lib/security/auth';
export const dynamic = 'force-dynamic';
export async function POST(req:Request){try{const env=await authEnv();if(!validOrigin(req,env))return NextResponse.json({error:'Invalid origin.'},{status:403});const token=(await cookies()).get('__Host-viewpoint_session')?.value;if(token&&/^[0-9a-f]{64}$/.test(token))await env.DB.prepare('UPDATE auth_sessions SET revoked_at=unixepoch() WHERE token_hash=?').bind(await tokenHash(token)).run();const r=NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});r.cookies.set('__Host-viewpoint_session','',{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:0});return r;}catch{return NextResponse.json({error:'Unable to sign out.'},{status:503});}}
