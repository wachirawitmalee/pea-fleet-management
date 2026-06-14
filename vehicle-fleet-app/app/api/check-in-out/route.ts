import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

import { prisma } from '@/lib/prisma';

// GET: ดึงประวัติการวิ่งรถทั้งหมด
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
    
    // แปลง mileage ให้เป็นตัวเลขที่ปลอดภัย (ป้องกัน NaN)
    const mileageNum = parseInt(mileage) || 0;

    // ===============================================
    // กรณีที่ 1: นำรถออก แบบ "มีใบจองล่วงหน้า"
    // ===============================================
    if (reservationId) {
      const reservation = await prisma.reservation.findUnique({ where: { reservationId } });
      if (!reservation) return NextResponse.json({ error: 'ไม่พบใบจอง' }, { status: 404 });

      // -- IN (นำรถออก) --
      if (type === 'IN') {
        const log = await prisma.checkInOutLog.create({
          data: { 
            reservationId, 
            vehicleId: reservation.vehicleId, 
            employeeId: reservation.employeeId, 
            checkInTime: new Date(), 
            mileageOut: mileageNum, 
            photoOutUrl: photoUrl || null 
          }
        });
        await prisma.reservation.update({ where: { reservationId }, data: { reservationStatus: 'CHECKED_IN' } });
        await prisma.vehicle.update({ 
          where: { vehicleId: reservation.vehicleId }, 
          data: { vehicleStatus: 'IN_USE', currentMileage: mileageNum } 
        });
        return NextResponse.json(log);
      } 
      
      // -- OUT (คืนรถ) --
      if (type === 'OUT') {
        // ค้นหา log เพื่อหา logId ก่อนอัปเดต (ปลอดภัยกว่าใช้ reservationId ใน where)
        const existingLog = await prisma.checkInOutLog.findFirst({ where: { reservationId } });
        if (!existingLog) return NextResponse.json({ error: 'ไม่พบประวัติการใช้งานรถ' }, { status: 404 });

        const log = await prisma.checkInOutLog.update({
          where: { logId: existingLog.logId },
          data: { checkOutTime: new Date(), mileageIn: mileageNum, photoInUrl: photoUrl || null, remark: remark || null }
        });
        await prisma.reservation.update({ where: { reservationId }, data: { reservationStatus: 'COMPLETED' } });
        await prisma.vehicle.update({ 
          where: { vehicleId: reservation.vehicleId }, 
          data: { vehicleStatus: 'AVAILABLE', currentMileage: mileageNum } 
        });
        return NextResponse.json(log);
      }
    } 
    
    // ===============================================
    // กรณีที่ 2: นำรถออก แบบ "ไม่ต้องมีใบจอง" (WALK-IN FLOW)
    // ===============================================
    else if (vehicleId && type === 'IN') {
      if (!employeeId) return NextResponse.json({ error: '❌ กรุณาระบุรหัสพนักงาน' }, { status: 400 });
      
      const emp = await prisma.employee.findUnique({ where: { employeeId } });
      if (!emp) return NextResponse.json({ error: '❌ ไม่พบรหัสพนักงานนี้ในระบบ' }, { status: 404 });

      const v = await prisma.vehicle.findUnique({ where: { vehicleId } });
      if (v?.vehicleStatus !== 'AVAILABLE') return NextResponse.json({ error: '❌ รถยนต์คันนี้ไม่พร้อมใช้งาน' }, { status: 400 });

      const log = await prisma.checkInOutLog.create({
        data: { vehicleId, employeeId, checkInTime: new Date(), mileageOut: mileageNum, photoOutUrl: photoUrl || null }
      });
      await prisma.vehicle.update({ where: { vehicleId }, data: { vehicleStatus: 'IN_USE', currentMileage: mileageNum } });
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
        where: { logId: activeLog.logId }, // ใช้ logId ที่เป็น Primary Key เสมอ
        data: { checkOutTime: new Date(), mileageIn: mileageNum, photoInUrl: photoUrl || null, remark: remark || null }
      });
      await prisma.vehicle.update({ where: { vehicleId }, data: { vehicleStatus: 'AVAILABLE', currentMileage: mileageNum } });
      return NextResponse.json(log);
    }

    return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง กรุณาลองใหม่' }, { status: 400 });

  } catch (error) {
    console.error("CheckInOut Error:", error);
    return NextResponse.json({ error: 'บันทึกข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}