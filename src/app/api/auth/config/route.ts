import { NextResponse } from 'next/server';
import { authEnv } from '@/lib/security/auth';
export const dynamic = 'force-dynamic';
export async function GET(){try{const env=await authEnv();return NextResponse.json({siteKey:env.TURNSTILE_SITE_KEY},{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({error:'Authentication is not configured yet.'},{status:503,headers:{'Cache-Control':'no-store'}});}}
