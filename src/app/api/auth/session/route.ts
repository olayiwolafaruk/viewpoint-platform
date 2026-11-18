import { NextResponse } from 'next/server';
import { authEnv, currentUser } from '@/lib/security/auth';
export const dynamic = 'force-dynamic';
export async function GET(){try{const user=await currentUser(await authEnv());return NextResponse.json({user},{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({error:'Account service unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});}}
