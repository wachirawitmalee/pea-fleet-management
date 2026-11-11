import { adminCookie, readAdmin } from '@/lib/admin-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function proxy(request: NextRequest) {
  if (process.env.FLEET_READ_ONLY === 'true' && (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) || request.nextUrl.pathname === '/api/alerts/send')) {
    return NextResponse.json({ error: 'ระบบกำลังย้ายข้อมูล กรุณาลองทำรายการอีกครั้งในอีกสักครู่' }, { status: 503, headers: { 'Retry-After': '120' } });
  }
  const path = request.nextUrl.pathname;
  if (process.env.NODE_ENV === 'development' && process.env.FLEET_LOCAL_PREVIEW === 'true' && path === '/api/alerts/send') {
    return NextResponse.json({error:'ปิดการส่งแจ้งเตือนจริงในโหมดตัวอย่าง'},{status:503});
  }
  const mutation = !['GET','HEAD','OPTIONS'].includes(request.method);
  const privatePage = path.startsWith('/admin/') && !path.includes('/print');
  const adminMutation = mutation && (/^\/api\/(vehicles|employees|settings|departments|fuel|shops)(?:\/|$)/.test(path) ||
    (path === '/api/maintenance' && request.method !== 'POST'));
  if (privatePage || adminMutation) {
    const auth = await readAdmin(request.cookies.get(adminCookie)?.value);
    if (!auth) return privatePage ? NextResponse.redirect(new URL('/admin',request.url)) : NextResponse.json({error:'กรุณาเข้าสู่ระบบแอดมิน'},{status:401});
    if (path === '/admin/accounts' && auth.role !== 'super') return NextResponse.redirect(new URL('/admin',request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/api/:path*','/admin/:path*'] };
