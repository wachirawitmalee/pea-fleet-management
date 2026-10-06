import { prisma } from './prisma';

export async function currentVehicles(vehicleId?: string) {
  const where = vehicleId ? { vehicleId } : undefined;
  // Every mileage entry point updates this value. Historical errors must not
  // override an administrator's correction when vehicles are read again.
  return prisma.vehicle.findMany({ where, orderBy: { plateNumber: 'asc' } });
}
