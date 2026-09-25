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
    const { reservationId, type, remark } = body;
    const mileage = Number(body.mileage);
    if (!['IN', 'OUT'].includes(type) || body.mileage === '' || body.mileage == null || !Number.isSafeInteger(mileage) || mileage < 0) return NextResponse.json({ error: 'กรุณาระบุประเภทและเลขไมล์ให้ถูกต้อง' }, { status: 400 });
    const reservation = reservationId ? await prisma.reservation.findUnique({ where: { reservationId } }) : null;
    if (reservationId && !reservation) return NextResponse.json({ error: 'ไม่พบใบจอง' }, { status: 404 });
    const vehicleId = reservation?.vehicleId || body.vehicleId;
    const employeeId = reservation?.employeeId || body.employeeId;
    if (!vehicleId) return NextResponse.json({ error: 'กรุณาระบุรถยนต์' }, { status: 400 });
    const vehicle = await prisma.vehicle.findUnique({ where: { vehicleId } });
    if (!vehicle) return NextResponse.json({ error: 'ไม่พบรถยนต์' }, { status: 404 });
    if (type === 'IN') {
      if (reservation && reservation.reservationStatus !== 'BOOKED') return NextResponse.json({ error: 'ใบจองนี้ไม่สามารถรับรถได้' }, { status: 409 });
      const employee = employeeId ? await prisma.employee.findUnique({ where: { employeeId } }) : null;
      if (!employee || employee.status !== 'ACTIVE') return NextResponse.json({ error: 'ไม่พบพนักงานที่พร้อมใช้งาน' }, { status: 400 });
      const active = await prisma.checkInOutLog.findFirst({ where: { vehicleId, checkOutTime: null } });
      if (vehicle.vehicleStatus !== 'AVAILABLE' || active) return NextResponse.json({ error: 'รถยนต์ไม่พร้อมใช้งานหรือยังไม่คืนรถ' }, { status: 409 });
      if (mileage < vehicle.currentMileage) return NextResponse.json({ error: 'เลขไมล์น้อยกว่าค่าปัจจุบันของรถ' }, { status: 400 });
      const photo = await storePhoto(body.photoUrl);
      const [log] = await prisma.$transaction([
        prisma.checkInOutLog.create({ data: { reservationId: reservationId || null, vehicleId, employeeId, mileageOut: mileage, photoOutUrl: photo, checkInTime: new Date() } }),
        prisma.vehicle.update({ where: { vehicleId }, data: { vehicleStatus: 'IN_USE', currentMileage: mileage } }),
        ...(reservationId ? [prisma.reservation.update({ where: { reservationId }, data: { reservationStatus: 'CHECKED_IN' } })] : []),
      ]);
      return NextResponse.json(log);
    }
    if (reservation && reservation.reservationStatus !== 'CHECKED_IN') return NextResponse.json({ error: 'ใบจองนี้ยังไม่ได้รับรถหรือคืนรถแล้ว' }, { status: 409 });
    const active = await prisma.checkInOutLog.findFirst({ where: { vehicleId, reservationId: reservationId || null, checkOutTime: null }, orderBy: { checkInTime: 'desc' } });
    if (!active) return NextResponse.json({ error: 'ไม่พบประวัติรถที่รอคืน' }, { status: 404 });
    if (mileage < active.mileageOut || mileage < vehicle.currentMileage) return NextResponse.json({ error: 'เลขไมล์คืนรถต้องไม่น้อยกว่าเลขไมล์ขาไปและเลขไมล์ปัจจุบัน' }, { status: 400 });
    const photo = await storePhoto(body.photoUrl);
    const [log] = await prisma.$transaction([
      prisma.checkInOutLog.update({ where: { logId: active.logId }, data: { mileageIn: mileage, photoInUrl: photo, checkOutTime: new Date(), remark: remark || null } }),
      prisma.vehicle.update({ where: { vehicleId }, data: { currentMileage: mileage, vehicleStatus: 'AVAILABLE' } }),
      ...(reservationId ? [prisma.reservation.update({ where: { reservationId }, data: { reservationStatus: 'COMPLETED' } })] : []),
    ]);
    return NextResponse.json(log);
  } catch (error) {
    console.error('Check-in/out failed:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'บันทึกไม่สำเร็จ กรุณาตรวจสอบข้อมูลและรูปภาพ' }, { status: 500 });
  }
}
export const POST = withStorage(handlePOST);
