import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    let reservations = await prisma.reservation.findMany({
      include: { vehicle: true, employee: true },
      orderBy: { startDate: 'desc' }
    });
    
    const now = new Date();

    // 🌟 ยกเลิกอัตโนมัติถ้ารอรับรถเกิน 1 ชั่วโมง (ป้องกันการจองค้างในตารางหลัก)
    for (const r of reservations) {
      if (r.reservationStatus === 'BOOKED') {
        const startDateTime = new Date(r.startDate);
        if (r.startTime) {
          const [h, m] = r.startTime.split(':').map(Number);
          startDateTime.setHours(h, m, 0, 0);
        }
        const cancelTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); 
        
        if (now >= cancelTime) {
          await prisma.reservation.update({
            where: { reservationId: r.reservationId },
            data: { reservationStatus: 'CANCELLED' }
          });
          r.reservationStatus = 'CANCELLED';
        }
      }
    }

    const logs = await prisma.checkInOutLog.findMany();
    const dataWithLogs = reservations.map(res => ({
      ...res,
      checkInOutLog: logs.find(l => l.reservationId === res.reservationId) || null
    }));

    return NextResponse.json(dataWithLogs);
  } catch (error) {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, vehicleId, startDate, startTime, endDate, endTime, destination, purpose } = body;

    if (!employeeId || !vehicleId || !startDate || !endDate) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' }, { status: 400 });
    }

    const existingReservations = await prisma.reservation.findMany({
      where: { vehicleId: vehicleId, reservationStatus: { in: ['BOOKED', 'CHECKED_IN'] } }
    });

    const newStart = new Date(`${startDate.split('T')[0]}T${startTime || '00:00'}`);
    const newEnd = new Date(`${endDate.split('T')[0]}T${endTime || '23:59'}`);

    const isOverlapping = existingReservations.some(res => {
      const extStartStr = res.startDate.toISOString().split('T')[0];
      const extEndStr = res.endDate.toISOString().split('T')[0];
      const extStart = new Date(`${extStartStr}T${res.startTime || '00:00'}`);
      const extEnd = new Date(`${extEndStr}T${res.endTime || '23:59'}`);
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

export async function PUT(request: Request) {
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

export async function DELETE(request: Request) {
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