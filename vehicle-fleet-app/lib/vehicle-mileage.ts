type VehicleMileage = { vehicleId: string; currentMileage: number };
type TripMileage = { vehicleId: string; mileageOut: number; mileageIn: number | null };
type RepairMileage = { vehicleId: string; mileage: number; status: string };

export function parseMileage(value: unknown): number | null {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 2147483647 ? number : null;
}

// Older repairs and trips must never roll the odometer backwards.
export function reconcileMileage<T extends VehicleMileage>(vehicles: T[], trips: TripMileage[], repairs: RepairMileage[]): T[] {
  const values = new Map(vehicles.map(v => [v.vehicleId, v.currentMileage]));
  const add = (id: string, value: unknown) => {
    const mileage = parseMileage(value);
    if (values.has(id) && mileage !== null) values.set(id, Math.max(values.get(id)!, mileage));
  };
  trips.forEach(t => { add(t.vehicleId, t.mileageOut); add(t.vehicleId, t.mileageIn); });
  repairs.filter(r => r.status !== 'ยกเลิกการซ่อม').forEach(r => add(r.vehicleId, r.mileage));
  return vehicles.map(v => ({ ...v, currentMileage: values.get(v.vehicleId)! }));
}
