import { canHandover, handoverNote } from '@/lib/vehicle-handover';
import { recordLateUsage } from '@/lib/late-usage';
import { bookingTime } from '@/lib/fleet-time';
import { currentVehicles } from '@/lib/current-vehicles';
import { parseMileage } from '@/lib/vehicle-mileage';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withStorage } from '@/lib/storage/sheets';
import { storePhoto } from '@/lib/storage/photos';

export async function GET() {
  try {
    return NextResponse.json(await prisma.checkInOutLog.findMany({ include: { employee: true, vehicle: true }, orderBy: { checkInTime: 'desc' } }));
  } catch { return NextResponse.json({ error: 'โหลดประวัติไม่สำเร็จ' }, { status: 500 }); }
}

async function handlePOST(request: Request) {
  try {
    const body = await request.json();
    if (body.type === 'LATE') return recordLateUsage(body);
    const { reservationId, type, remark } = body;
    const mileage = parseMileage(body.mileage);
    if (!['IN', 'OUT'].includes(type) || mileage === null) return NextResponse.json({ error: 'กรุณาระบุประเภทและเลขไมล์ให้ถูกต้อง' }, { status: 400 });
    const reservation = reservationId ? await prisma.reservation.findUnique({ where: { reservationId } }) : null;
    if (reservationId && !reservation) return NextResponse.json({ error: 'ไม่พบใบจอง' }, { status: 404 });
    const vehicleId = reservation?.vehicleId || body.vehicleId;
    const employeeId = reservation?.employeeId || body.employeeId;
    if (!vehicleId) return NextResponse.json({ error: 'กรุณาระบุรถยนต์' }, { status: 400 });
    const [vehicle] = await currentVehicles(vehicleId);
    if (!vehicle) return NextResponse.json({ error: 'ไม่พบรถยนต์' }, { status: 404 });
    if (type === 'IN') {
      if (reservation && Date.now() >= bookingTime(reservation.startDate, reservation.startTime).getTime() + 30 * 60000) return NextResponse.json({ error: 'คิวหมดอายุ เนื่องจากเลยเวลารับรถ 30 นาที กรุณาจองใหม่' }, { status: 409 });
      if (reservation && reservation.reservationStatus !== 'BOOKED') return NextResponse.json({ error: 'ใบจองนี้ไม่สามารถรับรถได้' }, { status: 409 });
      const employee = employeeId ? await prisma.employee.findUnique({ where: { employeeId } }) : null;
      if (!employee || employee.status !== 'ACTIVE') return NextResponse.json({ error: 'ไม่พบพนักงานที่พร้อมใช้งาน' }, { status: 400 });
      const active = await prisma.checkInOutLog.findMany({ where: { vehicleId, checkOutTime: null } });
      const bookings = active.length ? await prisma.reservation.findMany({ where: { vehicleId } }) : [];
      const now = new Date();
      const handover = !!reservation && active.length > 0 && canHandover(active, bookings, now) && body.confirmPreviousReturned === true;
      if (vehicle.vehicleStatus === 'MAINTENANCE' || (active.length > 0 && !handover) || (vehicle.vehicleStatus !== 'AVAILABLE' && !handover)) return NextResponse.json({ error: 'รถยังมีรายการรับรถค้าง หากได้รับรถคืนมาจริง ให้ยืนยันการรับรถต่อจากรายการที่เลยกำหนดแล้ว' }, { status: 409 });
      if (mileage < vehicle.currentMileage) return NextResponse.json({ error: 'เลขไมล์น้อยกว่าค่าปัจจุบันของรถ' }, { status: 400 });
      const photo = await storePhoto(body.photoUrl);
      const [log] = await prisma.$transaction([
        prisma.checkInOutLog.create({ data: { reservationId: reservationId || null, vehicleId, employeeId, mileageOut: mileage, photoOutUrl: photo, checkInTime: now, remark: handover ? handoverNote(now, employeeId) + '\nรายการเดิม: ' + active.map(l => l.logId).join(', ') : null } }),
        ...active.map(l => prisma.checkInOutLog.update({ where: { logId: l.logId }, data: { remark: [l.remark, handoverNote(now, employeeId)].filter(Boolean).join('\n') } })),
        prisma.vehicle.update({ where: { vehicleId }, data: { vehicleStatus: 'IN_USE', currentMileage: mileage } }),
        ...(reservationId ? [prisma.reservation.update({ where: { reservationId }, data: { reservationStatus: 'CHECKED_IN' } })] : []),
      ]);
      return NextResponse.json(log);
    }
    if (reservation && reservation.reservationStatus !== 'CHECKED_IN') return NextResponse.json({ error: 'ใบจองนี้ยังไม่ได้รับรถหรือคืนรถแล้ว' }, { status: 409 });
    const active = await prisma.checkInOutLog.findFirst({ where: { vehicleId, reservationId: reservationId || null, checkOutTime: null }, orderBy: { checkInTime: 'desc' } });
    if (!active) return NextResponse.json({ error: 'ไม่พบประวัติรถที่รอคืน' }, { status: 404 });
    const allLogs = await prisma.checkInOutLog.findMany({ where: { vehicleId }, orderBy: { checkInTime: 'asc' } });
    const successor = allLogs.find(l => l.checkInTime > active.checkInTime);
    const actualReturn = successor ? (typeof body.actualReturn === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(body.actualReturn) ? new Date(body.actualReturn + ':00+07:00') : new Date(NaN)) : new Date();
    if (successor && (!body.actualReturn || !Number.isFinite(actualReturn.getTime()) || actualReturn < active.checkInTime || actualReturn > successor.checkInTime || actualReturn > new Date())) return NextResponse.json({ error: 'กรุณาระบุเวลาคืนจริงของรายการเก่า ซึ่งต้องไม่เกินเวลารับรถของคิวถัดไป' }, { status: 400 });
    if (mileage < active.mileageOut || (successor ? mileage > successor.mileageOut : mileage < vehicle.currentMileage)) return NextResponse.json({ error: successor ? 'เลขไมล์คืนของรายการเก่าต้องอยู่ระหว่างเลขไมล์ออกเดิมกับเลขไมล์รับรถของคิวถัดไป' : 'เลขไมล์คืนรถต้องไม่น้อยกว่าเลขไมล์ขาไปและเลขไมล์ปัจจุบัน' }, { status: 400 });
    const photo = await storePhoto(body.photoUrl);
    const [log] = await prisma.$transaction([
      prisma.checkInOutLog.update({ where: { logId: active.logId }, data: { mileageIn: mileage, photoInUrl: photo, checkOutTime: actualReturn, remark: [active.remark, remark].filter(Boolean).join("\n") || null } }),
      prisma.vehicle.update({ where: { vehicleId }, data: { currentMileage: Math.max(vehicle.currentMileage, mileage), vehicleStatus: vehicle.vehicleStatus === 'MAINTENANCE' ? 'MAINTENANCE' : allLogs.some(l => l.logId !== active.logId && !l.checkOutTime && l.checkInTime > active.checkInTime) ? 'IN_USE' : 'AVAILABLE' } }),
      ...(reservationId ? [prisma.reservation.update({ where: { reservationId }, data: { reservationStatus: 'COMPLETED' } })] : []),
    ]);
    return NextResponse.json(log);
  } catch (error) {
    console.error('Check-in/out failed:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'บันทึกไม่สำเร็จ กรุณาตรวจสอบข้อมูลและรูปภาพ' }, { status: 500 });
  }
}
export const POST = withStorage(handlePOST);
