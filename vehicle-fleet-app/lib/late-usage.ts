import { prisma } from './prisma';
import { parseMileage } from './vehicle-mileage';
import { canRecordLate, thaiDay } from './booking-status';
import { bookingTime } from './fleet-time';
import { storePhoto } from './storage/photos';

// Called inside withStorage: validation, log, booking and vehicle commit together.
export async function recordLateUsage(body: Record<string, unknown>, now = new Date()): Promise<Response> {
  const fail = (error: string, status = 400) => Response.json({ error }, { status });
  if (typeof body.reservationId !== 'string') return fail('กรุณาเลือกใบจอง');
  const booking = await prisma.reservation.findUnique({ where: { reservationId: body.reservationId } });
  if (!booking) return fail('ไม่พบใบจอง', 404);
  const previous = await prisma.checkInOutLog.findUnique({ where: { reservationId: booking.reservationId } });
  if (!canRecordLate(booking, !!previous, now)) return fail('บันทึกย้อนหลังได้เฉพาะคิวของวันนี้ที่ยังไม่มีประวัติรับรถ', 409);
  if (body.employeeId !== booking.employeeId) return fail('รหัสพนักงานต้องตรงกับผู้จอง');
  const employee = await prisma.employee.findUnique({ where: { employeeId: booking.employeeId } });
  if (!employee || employee.status !== 'ACTIVE') return fail('ไม่พบพนักงานที่พร้อมใช้งาน');
  const vehicle = await prisma.vehicle.findUnique({ where: { vehicleId: booking.vehicleId } });
  if (!vehicle) return fail('ไม่พบรถยนต์', 404);
  const returned = body.returned === true;
  const start = typeof body.actualStart === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(body.actualStart) ? new Date(body.actualStart + ':00+07:00') : new Date(NaN);
  const end = returned ? (typeof body.actualEnd === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(body.actualEnd) ? new Date(body.actualEnd + ':00+07:00') : new Date(NaN)) : now;
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || thaiDay(start) !== thaiDay(now) || thaiDay(end) !== thaiDay(now)
    || start > now || end > now || end < start) return fail('เวลารับ–คืนจริงต้องอยู่ในวันนี้ ไม่เป็นเวลาอนาคต และคืนหลังรับรถ');
  const mileageOut = parseMileage(body.mileage), mileageIn = returned ? parseMileage(body.mileageIn) : null;
  if (mileageOut === null || (returned && (mileageIn === null || mileageIn < mileageOut))) return fail('เลขไมล์ไม่ถูกต้อง หรือเลขไมล์คืนต่ำกว่าเลขไมล์ออก');
  const [logs, otherBookings] = await Promise.all([
    prisma.checkInOutLog.findMany({ where: { vehicleId: booking.vehicleId } }),
    prisma.reservation.findMany({ where: { vehicleId: booking.vehicleId, reservationStatus: { in: ['BOOKED', 'CHECKED_IN'] } } }),
  ]);
  if (!returned && (vehicle.vehicleStatus !== 'AVAILABLE' || logs.some(l => !l.checkOutTime))) return fail('รถกำลังถูกใช้งานหรืออยู่ระหว่างซ่อม กรุณาติดต่อแอดมิน', 409);
  if (logs.some(l => start < (l.checkOutTime || now) && end > l.checkInTime)) return fail('เวลาที่ระบุทับกับประวัติการใช้งานอื่น กรุณาติดต่อแอดมิน', 409);
  const occupiedUntil = returned ? end : new Date(Math.max(now.getTime(), bookingTime(booking.endDate, booking.endTime).getTime()));
  if (otherBookings.some(b => b.reservationId !== booking.reservationId && start < bookingTime(b.endDate, b.endTime) && occupiedUntil > bookingTime(b.startDate, b.startTime))) return fail('ช่วงเวลานี้มีคิวอื่นจองอยู่ กรุณาติดต่อแอดมินเพื่อตรวจสอบ', 409);
  const photo = await storePhoto(body.photoUrl);
  const note = 'บันทึกการใช้รถย้อนหลังภายในวันเดียวกัน เวลาแจ้งระบบ: ' + now.toISOString() + '\nสถานะใบจองเดิม: ' + booking.reservationStatus + '\n' + String(body.remark || '');
  const [log] = await prisma.$transaction([
    prisma.checkInOutLog.create({ data: { reservationId: booking.reservationId, vehicleId: booking.vehicleId, employeeId: booking.employeeId,
      checkInTime: start, checkOutTime: returned ? end : null, mileageOut, mileageIn, photoOutUrl: photo, remark: note } }),
    prisma.reservation.update({ where: { reservationId: booking.reservationId }, data: { reservationStatus: returned ? 'COMPLETED' : 'CHECKED_IN' } }),
    prisma.vehicle.update({ where: { vehicleId: booking.vehicleId }, data: {
      currentMileage: Math.max(vehicle.currentMileage, mileageIn ?? mileageOut),
      ...(!returned ? { vehicleStatus: 'IN_USE' } : {}),
    } }),
  ]);
  return Response.json(log);
}
