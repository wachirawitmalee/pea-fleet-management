import { canHandover } from '@/lib/vehicle-handover';
import { canRecordLate, calendarStatus } from '@/lib/booking-status';
import { currentVehicles } from '@/lib/current-vehicles';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const vehicleId = params.get('vehicleId');
  const code = params.get('code');
  if ((!vehicleId && !code) || (vehicleId || code || '').length > 200) return NextResponse.json({ error: 'รหัสรถไม่ถูกต้อง' }, { status: 400 });
  try {
    const storedVehicle = await prisma.vehicle.findUnique({ where: vehicleId ? { vehicleId } : { qrCodeData: code! } });
    if (!storedVehicle) return NextResponse.json({ error: 'ไม่พบรถยนต์คันนี้ในระบบ' }, { status: 404 });
    const [vehicle] = await currentVehicles(storedVehicle.vehicleId);
    const [bookings, logs] = await Promise.all([
      prisma.reservation.findMany({ where: { vehicleId: vehicle.vehicleId }, include: { employee: true }, orderBy: [{ startDate: 'asc' }, { startTime: 'asc' }] }),
      prisma.checkInOutLog.findMany({ where: { vehicleId: vehicle.vehicleId }, select: { logId: true, reservationId: true, mileageOut: true, checkOutTime: true, checkInTime: true, employeeId: true, employee: true } }),
    ]);
    const openLogs = logs.filter(l => !l.checkOutTime);
    const canConfirmHandover = vehicle.vehicleStatus !== 'MAINTENANCE' && canHandover(openLogs, bookings);
    return NextResponse.json({ vehicle, canConfirmHandover, overdueReturnCount: openLogs.length, bookings: bookings.filter(b => ['BOOKED', 'CHECKED_IN'].includes(b.reservationStatus) || canRecordLate(b, logs.some(l => l.reservationId === b.reservationId))).map(b => ({ ...b, vehicle, overdueReturnCount: openLogs.length, pendingReturn: logs.some(l => l.reservationId === b.reservationId && !l.checkOutTime && logs.some(n => n.checkInTime > l.checkInTime)), nextUsage: (() => { const log = logs.find(l => l.reservationId === b.reservationId); const next = log ? logs.filter(l => l.checkInTime > log.checkInTime).sort((a, b) => a.checkInTime.getTime() - b.checkInTime.getTime())[0] : null; return next ? { checkInTime: next.checkInTime, mileageOut: next.mileageOut } : null; })(), displayStatus: calendarStatus(b, logs.some(l => l.reservationId === b.reservationId)), canRecordLate: canRecordLate(b, logs.some(l => l.reservationId === b.reservationId)), checkInOutLog: logs.find(l => l.reservationId === b.reservationId) || null })), activeWalkInLog: logs.find(l => l.reservationId === null && !l.checkOutTime) || null }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'ไม่สามารถโหลดข้อมูลรถได้ กรุณาลองใหม่' }, { status: 503 });
  }
}
