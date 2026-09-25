import { bangkokMonth } from './fleet-time';

type Fuel = { date: Date | string; vehicleId: string; quantity: number; totalAmount: number };
type Trip = { vehicleId: string; checkOutTime: Date | string | null; mileageOut: number; mileageIn: number | null };
type Repair = { vehicleId: string; requestDate: Date | string; cost: number | null; status: string };
type Vehicle = { vehicleId: string; plateNumber: string };
const round = (n: number) => Math.round(n * 100) / 100;
export function fleetAnalytics(vehicles: Vehicle[], fuel: Fuel[], logs: Trip[], repairs: Repair[], month: string) {
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(`${month}-01T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() - 5 + i);
    return { month: date.toISOString().slice(0, 7), fuelCost: 0, liters: 0, maintenanceCost: 0, distance: 0, trips: 0 };
  });
  const buckets = new Map(months.map(m => [m.month, m]));
  const perVehicle = new Map(vehicles.map(v => [v.vehicleId, { ...v, fuelCost: 0, liters: 0, maintenanceCost: 0, distance: 0, trips: 0 }]));
  let invalidTrips = 0;
  let fuelEntries = 0;
  for (const record of fuel) {
    const key = bangkokMonth(record.date), bucket = buckets.get(key);
    if (bucket) { bucket.fuelCost += record.totalAmount; bucket.liters += record.quantity; }
    if (key === month) {
      fuelEntries++;
      const v = perVehicle.get(record.vehicleId);
      if (v) { v.fuelCost += record.totalAmount; v.liters += record.quantity; }
    }
  }
  for (const log of logs) {
    if (!log.checkOutTime) continue;
    const key = bangkokMonth(log.checkOutTime);
    if (log.mileageIn == null || log.mileageIn < log.mileageOut || !Number.isFinite(log.mileageIn - log.mileageOut)) {
      if (key === month) invalidTrips++;
      continue;
    }
    const distance = log.mileageIn - log.mileageOut, bucket = buckets.get(key);
    if (bucket) { bucket.trips++; bucket.distance += distance; }
    if (key === month) {
      const v = perVehicle.get(log.vehicleId);
      if (v) { v.trips++; v.distance += distance; }
    }
  }
  for (const repair of repairs) {
    if (repair.status === 'ยกเลิกการซ่อม' || repair.cost == null) continue;
    const key = bangkokMonth(repair.requestDate), bucket = buckets.get(key);
    if (bucket) bucket.maintenanceCost += repair.cost;
    if (key === month) { const v = perVehicle.get(repair.vehicleId); if (v) v.maintenanceCost += repair.cost; }
  }
  const current = months[5], previous = months[4];
  const rows = [...perVehicle.values()].map(v => ({ ...v, fuelCost: round(v.fuelCost), liters: round(v.liters), maintenanceCost: round(v.maintenanceCost), fuelCostPerKm: v.distance > 0 && v.liters > 0 ? round(v.fuelCost / v.distance) : null })).sort((a, b) => b.fuelCost - a.fuelCost);
  return {
    month, fuelEntries, invalidTrips,
    fuelCost: round(current.fuelCost), liters: round(current.liters), maintenanceCost: round(current.maintenanceCost),
    distance: current.distance, trips: current.trips,
    averagePrice: current.liters > 0 ? round(current.fuelCost / current.liters) : null,
    fuelCostChange: previous.fuelCost > 0 ? round((current.fuelCost - previous.fuelCost) / previous.fuelCost * 100) : null,
    activeVehicles: rows.filter(v => v.trips > 0).length,
    openRepairs: repairs.filter(r => !['ปิดใบซ่อม', 'ยกเลิกการซ่อม'].includes(r.status)).length,
    months: months.map(m => ({ ...m, fuelCost: round(m.fuelCost), liters: round(m.liters), maintenanceCost: round(m.maintenanceCost) })),
    vehicles: rows,
  };
}
export type FleetAnalytics = ReturnType<typeof fleetAnalytics>;
