import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const vehicles = await prisma.vehicle.findMany();
    let reservations = await prisma.reservation.findMany({
      include: { employee: true, vehicle: true }
    });

    const now = new Date();
    const alerts: any[] = []; // 🌟 ตัวแปรเก็บรายการแจ้งเตือน

    // 🌟 ระบบทำความสะอาด: ยกเลิกอัตโนมัติถ้ารอรับรถเกิน 1 ชั่วโมง
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

    // 🌟 ระบบแจ้งเตือนอัจฉริยะ (Alerts Logic)
    vehicles.forEach(v => {
      const plate = v.plateNumber;
      
      // 1. เช็คภาษีรถยนต์ (taxExpireDate)
      if (v.taxExpireDate) {
        const diffTime = new Date(v.taxExpireDate).getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          alerts.push({ level: 'danger', icon: '⛔', message: `รถทะเบียน <b>${plate}</b> ภาษีขาดต่ออายุ!` });
        } else if (diffDays <= 30) {
          alerts.push({ level: 'warning', icon: '📅', message: `รถทะเบียน <b>${plate}</b> ภาษีจะหมดอายุในอีก ${diffDays} วัน` });
        }
      }

      // 2. เช็คระยะไมล์เช็คศูนย์ (nextCheckMileage vs currentMileage)
      if (v.nextCheckMileage && v.currentMileage !== undefined) {
        const left = v.nextCheckMileage - v.currentMileage;
        if (left <= 0) {
          alerts.push({ level: 'danger', icon: '🔧', message: `รถทะเบียน <b>${plate}</b> เกินระยะที่ต้องเข้าศูนย์/เช็คช่วงล่างแล้ว!` });
        } else if (left <= 1000) {
          alerts.push({ level: 'info', icon: '🛠️', message: `รถทะเบียน <b>${plate}</b> อีก ${left.toLocaleString()} กม. จะถึงกำหนดเช็คระยะ` });
        }
      }

      // 3. เช็ควันที่ต้องเข้าศูนย์ (nextCheckDate)
      if (v.nextCheckDate) {
        const diffTime = new Date(v.nextCheckDate).getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
           alerts.push({ level: 'danger', icon: '🔧', message: `รถทะเบียน <b>${plate}</b> เลยกำหนดเข้าเช็คระยะตามวันที่แล้ว!` });
        } else if (diffDays <= 15) {
           alerts.push({ level: 'warning', icon: '🛠️', message: `รถทะเบียน <b>${plate}</b> จะถึงกำหนดเช็คระยะในอีก ${diffDays} วัน` });
        }
      }
    });

    // คำนวณสถิติภาพรวม
    const totalVehicles = vehicles.length;
    const availableVehicles = vehicles.filter(v => v.vehicleStatus === 'AVAILABLE').length;
    const inUseVehicles = vehicles.filter(v => v.vehicleStatus === 'IN_USE').length;
    const totalReservations = reservations.length;

    const deptCounts: Record<string, number> = {};
    reservations.forEach(r => {
      const dept = r.employee.department || 'ไม่ระบุแผนก';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });
    const topDepartments = Object.entries(deptCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);

    const vehicleCounts: Record<string, number> = {};
    reservations.forEach(r => {
      const name = `${r.vehicle.plateNumber}`;
      vehicleCounts[name] = (vehicleCounts[name] || 0) + 1;
    });
    const topVehicles = Object.entries(vehicleCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);

    const vehicleStatus = [
      { name: 'พร้อมใช้งาน', value: availableVehicles, fill: '#10b981' },
      { name: 'กำลังใช้งาน', value: inUseVehicles, fill: '#f59e0b' },
      { name: 'ซ่อมบำรุง', value: totalVehicles - availableVehicles - inUseVehicles, fill: '#ef4444' }
    ].filter(s => s.value > 0);

    const activeBookings = reservations.filter(r => {
      if (r.reservationStatus === 'BOOKED') {
        const startDateTime = new Date(r.startDate);
        if (r.startTime) {
          const [h, m] = r.startTime.split(':').map(Number);
          startDateTime.setHours(h, m, 0, 0);
        }
        return now > startDateTime; 
      }
      if (r.reservationStatus === 'CHECKED_IN') {
        const endDateTime = new Date(r.endDate);
        if (r.endTime) {
          const [h, m] = r.endTime.split(':').map(Number);
          endDateTime.setHours(h, m, 0, 0);
        }
        return now > endDateTime;
      }
      return false; 
    }).map(r => ({
      ...r,
      isOverdue: true,
      overdueType: r.reservationStatus === 'BOOKED' ? 'LATE_CHECKIN' : 'LATE_CHECKOUT'
    }));

    // 🌟 ส่ง alerts กลับไปให้หน้าบ้านด้วย
    return NextResponse.json({
      totalVehicles, availableVehicles, inUseVehicles, totalReservations,
      topDepartments, topVehicles, vehicleStatus, activeBookings, alerts
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}