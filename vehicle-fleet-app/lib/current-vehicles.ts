import { prisma } from './prisma';
import { reconcileMileage } from './vehicle-mileage';

export async function currentVehicles(vehicleId?: string) {
  const where = vehicleId ? { vehicleId } : undefined;
  const [vehicles, trips, repairs] = await Promise.all([
    prisma.vehicle.findMany({ where, orderBy: { plateNumber: 'asc' } }),
    prisma.checkInOutLog.findMany({ where, select: { vehicleId: true, mileageOut: true, mileageIn: true } }),
    prisma.maintenanceTicket.findMany({ where, select: { vehicleId: true, mileage: true, status: true } }),
  ]);
  return reconcileMileage(vehicles, trips, repairs);
}
