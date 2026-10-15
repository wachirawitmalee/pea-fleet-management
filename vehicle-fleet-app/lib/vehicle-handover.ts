import { bookingTime } from './fleet-time';
type OpenLog = { logId: string; reservationId: string | null; checkInTime: Date | string; checkOutTime: Date | string | null };
type Booking = { reservationId: string; endDate: Date | string; endTime: string };
export function canHandover(logs: OpenLog[], bookings: Booking[], at = new Date()) {
  return logs.length > 0 && logs.every(log => {
    const booking = bookings.find(b => b.reservationId === log.reservationId);
    return !log.checkOutTime && new Date(log.checkInTime) < at && !!booking && bookingTime(booking.endDate, booking.endTime) <= at;
  });
}
export function handoverNote(at: Date, employeeId: string) {
  return `[HANDOVER] ${at.toISOString()} ผู้รับรถต่อ ${employeeId} ยืนยันว่ารถคืนมาจริงแล้ว แต่รายการนี้ยังรอบันทึกคืนรถเดิม`;
}
