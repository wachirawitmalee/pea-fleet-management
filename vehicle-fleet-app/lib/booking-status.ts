import { bookingTime } from './fleet-time';
export const bookingStatuses = {
  BOOKED: { label: 'จองแล้ว / รอรับรถ', background: '#dc2626', color: '#ffffff' },
  CHECKED_IN: { label: 'กำลังใช้งาน', background: '#2563eb', color: '#ffffff' },
  COMPLETED: { label: 'คืนรถแล้ว', background: '#15803d', color: '#ffffff' },
  EXPIRED: { label: 'หลุดจอง / ไม่มารับรถ', background: '#d97706', color: '#111827' },
  CANCELLED: { label: 'ยกเลิกการจอง', background: '#64748b', color: '#ffffff' },
};
type Booking = { reservationStatus: string; startDate: Date | string; startTime: string };
export function calendarStatus(b: Booking, hasLog: boolean, now = new Date()) {
  if (b.reservationStatus === 'BOOKED' && !hasLog && now.getTime() >= bookingTime(b.startDate, b.startTime).getTime() + 30 * 60000) return 'EXPIRED';
  return b.reservationStatus in bookingStatuses ? b.reservationStatus as keyof typeof bookingStatuses : 'CANCELLED';
}
export function thaiDay(date: Date | string) {
  return new Date(new Date(date).getTime() + 7 * 3600000).toISOString().slice(0, 10);
}
export function canRecordLate(b: Booking, hasLog: boolean, now = new Date()) {
  return !hasLog && String(b.startDate instanceof Date ? b.startDate.toISOString() : b.startDate).slice(0, 10) === thaiDay(now)
    && (['EXPIRED', 'CANCELLED'].includes(b.reservationStatus) || calendarStatus(b, false, now) === 'EXPIRED');
}
