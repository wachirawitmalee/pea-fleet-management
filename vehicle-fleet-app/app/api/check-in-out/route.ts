import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: ดึงประวัติการวิ่งรถทั้งหมด (เพื่อเช็คว่าคันไหน Walk-in ค้างอยู่)
export async function GET() {
  try {
    const logs = await prisma.checkInOutLog.findMany({
      include: { employee: true, vehicle: true },
      orderBy: { checkInTime: 'desc' }
    });
    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reservationId, vehicleId, employeeId, type, mileage, photoUrl, remark } = body;

    // ===============================================
    // กรณีที่ 1: นำรถออก แบบ "มีใบจองล่วงหน้า" (NORMAL FLOW)
    // ===============================================
    if (reservationId) {
      const reservation = await prisma.reservation.findUnique({ where: { reservationId } });
      if (!reservation) return NextResponse.json({ error: 'ไม่พบใบจอง' }, { status: 404 });

      if (type === 'IN') {
        const log = await prisma.checkInOutLog.create({
          data: { 
            reservationId, vehicleId: reservation.vehicleId, employeeId: reservation.employeeId, 
            checkInTime: new Date(), mileageOut: parseInt(mileage), photoOutUrl: photoUrl || null 
          }
        });
        await prisma.reservation.update({ where: { reservationId }, data: { reservationStatus: 'CHECKED_IN' } });
        // อัปเดตสถานะรถและไมล์ปัจจุบัน
        await prisma.vehicle.update({ where: { vehicleId: reservation.vehicleId }, data: { vehicleStatus: 'IN_USE', currentMileage: parseInt(mileage) } });
        return NextResponse.json(log);
      } 
      
      if (type === 'OUT') {
        const log = await prisma.checkInOutLog.update({
          where: { reservationId },
          data: { checkOutTime: new Date(), mileageIn: parseInt(mileage), photoInUrl: photoUrl || null, remark: remark || null }
        });
        await prisma.reservation.update({ where: { reservationId }, data: { reservationStatus: 'COMPLETED' } });
        // คืนรถแล้ว อัปเดตสถานะและไมล์ปัจจุบัน
        await prisma.vehicle.update({ where: { vehicleId: reservation.vehicleId }, data: { vehicleStatus: 'AVAILABLE', currentMileage: parseInt(mileage) } });
        return NextResponse.json(log);
      }
    } 
    
    // ===============================================
    // กรณีที่ 2: นำรถออก แบบ "ไม่ต้องมีใบจอง" (WALK-IN FLOW)
    // ===============================================
    else if (vehicleId && type === 'IN') {
      if (!employeeId) return NextResponse.json({ error: '❌ กรุณาระบุรหัสพนักงาน' }, { status: 400 });
      
      // ตรวจสอบพนักงานก่อน
      const emp = await prisma.employee.findUnique({ where: { employeeId } });
      if (!emp) return NextResponse.json({ error: '❌ ไม่พบรหัสพนักงานนี้ในระบบ กรุณาตรวจสอบอีกครั้ง' }, { status: 404 });

      // ตรวจสอบว่ารถว่างจริงไหม (เผื่อส่งซ่อมอยู่)
      const v = await prisma.vehicle.findUnique({ where: { vehicleId } });
      if (v?.vehicleStatus !== 'AVAILABLE') return NextResponse.json({ error: '❌ รถยนต์คันนี้ไม่พร้อมใช้งาน' }, { status: 400 });

      const log = await prisma.checkInOutLog.create({
        data: { vehicleId, employeeId, checkInTime: new Date(), mileageOut: parseInt(mileage), photoOutUrl: photoUrl || null }
      });
      await prisma.vehicle.update({ where: { vehicleId }, data: { vehicleStatus: 'IN_USE', currentMileage: parseInt(mileage) } });
      return NextResponse.json(log);
    }
    else if (vehicleId && type === 'OUT') {
      // หางาน Walk-in ที่ยังไม่คืนรถ
      const activeLog = await prisma.checkInOutLog.findFirst({
        where: { vehicleId, checkOutTime: null, reservationId: null },
        orderBy: { checkInTime: 'desc' }
      });
      if (!activeLog) return NextResponse.json({ error: '❌ ไม่พบประวัติการนำรถออกสำหรับรถคันนี้' }, { status: 404 });

      const log = await prisma.checkInOutLog.update({
        where: { logId: activeLog.logId },
        data: { checkOutTime: new Date(), mileageIn: parseInt(mileage), photoInUrl: photoUrl || null, remark: remark || null }
      });
      await prisma.vehicle.update({ where: { vehicleId }, data: { vehicleStatus: 'AVAILABLE', currentMileage: parseInt(mileage) } });
      return NextResponse.json(log);
    }

    return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง กรุณาลองใหม่' }, { status: 400 });

  } catch (error) {
    console.error("CheckInOut Error:", error);
    return NextResponse.json({ error: 'บันทึกข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}