import { prisma } from './prisma';
import { expiredBookingIds } from './booking-expiry';
export async function expireBookings(now = new Date()) {
  const [bookings, logs] = await Promise.all([
    prisma.reservation.findMany({ where: { reservationStatus: 'BOOKED' } }),
    prisma.checkInOutLog.findMany({ select: { reservationId: true } }),
  ]);
  const ids = expiredBookingIds(bookings, logs, now);
  // Booking cancellation releases only the time slot. It must never change a
  // vehicle that is being used or undergoing maintenance to AVAILABLE.
  if (ids.length) await prisma.$transaction(ids.map(reservationId => prisma.reservation.update({
    where: { reservationId }, data: { reservationStatus: 'EXPIRED' },
  })));
  return ids;
}
