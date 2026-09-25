import { withStorage } from '@/lib/storage/sheets';
import { bookingTime } from '@/lib/fleet-time';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';




export async function GET() {
  try {
    const reservations = await prisma.reservation.findMany({
      include: { vehicle: true, employee: true },
      orderBy: { startDate: 'desc' }
    });
    
    const logs = await prisma.checkInOutLog.findMany();
    const logByReservation = new Map(logs.map(log => [log.reservationId, log]));
    const dataWithLogs = reservations.map(res => ({
      ...res,
      checkInOutLog: logByReservation.get(res.reservationId) || null
    }));

    return NextResponse.json(dataWithLogs);
  } catch (error) {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' }, { status: 500 });
  }
}

async function handlePOST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, vehicleId, startDate, startTime, endDate, endTime, destination, purpose } = body;

    if (!employeeId || !vehicleId || !startDate || !endDate) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' }, { status: 400 });
    }

    const existingReservations = await prisma.reservation.findMany({
      where: { vehicleId: vehicleId, reservationStatus: { in: ['BOOKED', 'CHECKED_IN'] } }
    });

    if (!/^\d{2}:\d{2}$/.test(startTime || '') || !/^\d{2}:\d{2}$/.test(endTime || '')) return NextResponse.json({ error: 'กรุณาระบุเวลาให้ถูกต้อง' }, { status: 400 });
    const newStart = bookingTime(startDate, startTime);
    const newEnd = bookingTime(endDate, endTime);
    if (!Number.isFinite(newStart.getTime()) || !Number.isFinite(newEnd.getTime()) || newEnd <= newStart) return NextResponse.json({ error: 'วันและเวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น' }, { status: 400 });
    const [employee, vehicle] = await Promise.all([prisma.employee.findUnique({ where: { employeeId } }), prisma.vehicle.findUnique({ where: { vehicleId } })]);
    if (!employee || employee.status !== 'ACTIVE' || !vehicle || !vehicle.isBookable || vehicle.vehicleStatus === 'MAINTENANCE') return NextResponse.json({ error: 'พนักงานหรือรถยนต์ไม่พร้อมสำหรับการจอง' }, { status: 400 });

    const isOverlapping = existingReservations.some(res => {
      const extStart = bookingTime(res.startDate, res.startTime);
      const extEnd = bookingTime(res.endDate, res.endTime);
      return (newStart < extEnd && newEnd > extStart);
    });

    if (isOverlapping) {
      return NextResponse.json({ error: '❌ รถยนต์คันนี้ถูกจองในช่วงวันและเวลาดังกล่าวแล้ว' }, { status: 400 });
    }

    const newReservation = await prisma.reservation.create({
      data: { employeeId, vehicleId, startDate: new Date(startDate), startTime, endDate: new Date(endDate), endTime, destination, purpose, reservationStatus: 'BOOKED' },
    });

    return NextResponse.json({ success: true, data: newReservation }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลการจอง' }, { status: 500 });
  }
}

async function handlePUT(request: Request) {
  try {
    const body = await request.json();
    const { reservationId, reservationStatus } = body;
    const updatedReservation = await prisma.reservation.update({
      where: { reservationId }, data: { reservationStatus }
    });
    return NextResponse.json({ success: true, data: updatedReservation });
  } catch (error) {
    return NextResponse.json({ error: 'ไม่สามารถอัปเดตสถานะได้' }, { status: 500 });
  }
}

async function handleDELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reservationId = searchParams.get('id');

    // 🌟 เพิ่มเงื่อนไขเช็ค null ตรงนี้ TypeScript จะเข้าใจทันที
    if (!reservationId) {
      return NextResponse.json({ error: 'ไม่พบรหัสการจอง' }, { status: 400 });
    }

    // ตอนนี้ TypeScript รู้แล้วว่า reservationId ต้องเป็น string แน่นอน
    await prisma.checkInOutLog.deleteMany({ where: { reservationId } });
    await prisma.reservation.delete({ where: { reservationId } });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'ไม่สามารถลบรายการจองนี้ได้' }, { status: 500 });
  }
}
export const POST = withStorage(handlePOST);

export const PUT = withStorage(handlePUT);

export const DELETE = withStorage(handleDELETE);
