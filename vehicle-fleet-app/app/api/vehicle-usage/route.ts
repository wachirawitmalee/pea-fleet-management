import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const vehicleId = params.get('vehicleId');
  const code = params.get('code');
  if ((!vehicleId && !code) || (vehicleId || code || '').length > 200) return NextResponse.json({ error: 'รหัสรถไม่ถูกต้อง' }, { status: 400 });
  try {
    const vehicle = await prisma.vehicle.findUnique({ where: vehicleId ? { vehicleId } : { qrCodeData: code! } });
    if (!vehicle) return NextResponse.json({ error: 'ไม่พบรถยนต์คันนี้ในระบบ' }, { status: 404 });
    const [bookings, logs] = await Promise.all([
      prisma.reservation.findMany({ where: { vehicleId: vehicle.vehicleId, reservationStatus: { in: ['BOOKED', 'CHECKED_IN'] } }, include: { employee: true }, orderBy: [{ startDate: 'asc' }, { startTime: 'asc' }] }),
      prisma.checkInOutLog.findMany({ where: { vehicleId: vehicle.vehicleId, checkOutTime: null }, select: { logId: true, reservationId: true, mileageOut: true, checkInTime: true, employeeId: true, employee: true } }),
    ]);
    return NextResponse.json({ vehicle, bookings: bookings.map(b => ({ ...b, vehicle, checkInOutLog: logs.find(l => l.reservationId === b.reservationId) || null })), activeWalkInLog: logs.find(l => l.reservationId === null) || null }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'ไม่สามารถโหลดข้อมูลรถได้ กรุณาลองใหม่' }, { status: 503 });
  }
}
