import { bookingTime } from './fleet-time';
type Booking = { reservationId: string; reservationStatus: string; startDate: Date | string; startTime: string };
export function expiredBookingIds(bookings: Booking[], logs: { reservationId: string | null }[], now = new Date()): string[] {
  const received = new Set(logs.map(l => l.reservationId));
  return bookings.filter(b => b.reservationStatus === 'BOOKED' && !received.has(b.reservationId)
    && now.getTime() >= bookingTime(b.startDate, b.startTime).getTime() + 30 * 60000).map(b => b.reservationId);
}
