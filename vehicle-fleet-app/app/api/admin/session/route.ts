import { NextResponse } from 'next/server';
import { adminCookie, adminFromRequest, issueAdmin, loginAdmin } from '@/lib/admin-auth';
const reply = (data:unknown,status=200) => NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request) {
  const session=await adminFromRequest(request);
  return session ? reply({id:session.id,role:session.role}) : reply({error:'กรุณาเข้าสู่ระบบ'},401);
}
export async function POST(request:Request) {
  try {
    if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) return reply({error:'คำขอไม่ถูกต้อง'},403);
    const body=await request.json();
    const auth=typeof body.id==='string'&&typeof body.password==='string' ? await loginAdmin(body.id.trim(),body.password) : null;
    if (!auth) return reply({error:'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง'},401);
    const response=reply({id:auth.id,role:auth.role});
    response.cookies.set(adminCookie,issueAdmin(auth),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:28800});
    return response;
  } catch { return reply({error:'เข้าสู่ระบบไม่สำเร็จ'},503); }
}
export function DELETE() {
  const response=reply({ok:true}); response.cookies.delete(adminCookie); return response;
}
