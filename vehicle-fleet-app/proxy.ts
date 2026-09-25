import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  if (process.env.FLEET_READ_ONLY === 'true' && (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) || request.nextUrl.pathname === '/api/alerts/send')) {
    return NextResponse.json({ error: 'ระบบกำลังย้ายข้อมูล กรุณาลองทำรายการอีกครั้งในอีกสักครู่' }, { status: 503, headers: { 'Retry-After': '120' } });
  }
  return NextResponse.next();
}

export const config = { matcher: '/api/:path*' };
