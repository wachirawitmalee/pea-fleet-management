import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { fleetAnalytics } from '@/lib/analytics';
import { bangkokMonth, bookingTime } from '@/lib/fleet-time';




export async function GET(request: Request) {
  try {
    const month = new URL(request.url).searchParams.get('month') || bangkokMonth(new Date());
    if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) return NextResponse.json({ error: 'เดือนไม่ถูกต้อง' }, { status: 400 });
    const [vehicles, reservations, fuel, logs, repairs] = await Promise.all([
      prisma.vehicle.findMany(),
      prisma.reservation.findMany({ include: { employee: true, vehicle: true } }),
      prisma.fuelRecord.findMany({ select: { date: true, vehicleId: true, quantity: true, totalAmount: true } }),
      prisma.checkInOutLog.findMany({ select: { reservationId: true, vehicleId: true, checkOutTime: true, mileageOut: true, mileageIn: true } }),
      prisma.maintenanceTicket.findMany({ select: { vehicleId: true, requestDate: true, cost: true, status: true } }),
    ]);
    const logMap = new Map(logs.map(log => [log.reservationId, log]));
    const analytics = fleetAnalytics(vehicles, fuel, logs, repairs, month);

    const now = new Date();
    const alerts: { level: string; icon: string; message: string }[] = [];

    // 🌟 ระบบแจ้งเตือนอัจฉริยะ (Alerts Logic)
    vehicles.forEach(v => {
      const plate = v.plateNumber;
      
      // 1. เช็คภาษีรถยนต์ (taxExpireDate)
      if (v.taxExpireDate) {
        const diffTime = new Date(v.taxExpireDate).getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          alerts.push({ level: 'danger', icon: '⛔', message: `รถทะเบียน ${plate} ภาษีขาดต่ออายุ!` });
        } else if (diffDays <= 30) {
          alerts.push({ level: 'warning', icon: '📅', message: `รถทะเบียน ${plate} ภาษีจะหมดอายุในอีก ${diffDays} วัน` });
        }
      }

      // 2. เช็คระยะไมล์เช็คศูนย์ (nextCheckMileage vs currentMileage)
      if (v.nextCheckMileage && v.currentMileage !== undefined) {
        const left = v.nextCheckMileage - v.currentMileage;
        if (left <= 0) {
          alerts.push({ level: 'danger', icon: '🔧', message: `รถทะเบียน ${plate} เกินระยะที่ต้องเข้าศูนย์/เช็คช่วงล่างแล้ว!` });
        } else if (left <= 1000) {
          alerts.push({ level: 'info', icon: '🛠️', message: `รถทะเบียน ${plate} อีก ${left.toLocaleString()} กม. จะถึงกำหนดเช็คระยะ` });
        }
      }

      // 3. เช็ควันที่ต้องเข้าศูนย์ (nextCheckDate)
      if (v.nextCheckDate) {
        const diffTime = new Date(v.nextCheckDate).getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
           alerts.push({ level: 'danger', icon: '🔧', message: `รถทะเบียน ${plate} เลยกำหนดเข้าเช็คระยะตามวันที่แล้ว!` });
        } else if (diffDays <= 15) {
           alerts.push({ level: 'warning', icon: '🛠️', message: `รถทะเบียน ${plate} จะถึงกำหนดเช็คระยะในอีก ${diffDays} วัน` });
        }
      }
    });

    // คำนวณสถิติภาพรวม
    const totalVehicles = vehicles.length;
    const availableVehicles = vehicles.filter(v => v.vehicleStatus === 'AVAILABLE').length;
    const inUseVehicles = vehicles.filter(v => v.vehicleStatus === 'IN_USE').length;
    const totalReservations = reservations.length;

    const deptCounts: Record<string, number> = {};
    reservations.filter(r => r.reservationStatus !== 'CANCELLED').forEach(r => {
      const dept = r.employee.department || 'ไม่ระบุแผนก';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });
    const topDepartments = Object.entries(deptCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);

    const vehicleCounts: Record<string, number> = {};
    reservations.filter(r => r.reservationStatus !== 'CANCELLED').forEach(r => {
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
        const startDateTime = bookingTime(r.startDate, r.startTime);
        return now > startDateTime; 
      }
      if (r.reservationStatus === 'CHECKED_IN') {
        const endDateTime = bookingTime(r.endDate, r.endTime);
        return now > endDateTime;
      }
      return false; 
    }).map(r => ({
      ...r,
      checkInOutLog: logMap.get(r.reservationId) || null,
      isOverdue: true,
      overdueType: r.reservationStatus === 'BOOKED' ? 'LATE_CHECKIN' : 'LATE_CHECKOUT'
    }));

    // 🌟 ส่ง alerts กลับไปให้หน้าบ้านด้วย
    return NextResponse.json({
      totalVehicles, availableVehicles, inUseVehicles, totalReservations,
      topDepartments, topVehicles, vehicleStatus, activeBookings, alerts, analytics
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
