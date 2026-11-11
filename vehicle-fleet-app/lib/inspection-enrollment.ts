import { prisma } from './prisma';
import { isInspectionCategory, type VehicleCategory } from './inspection';

export const inspectionEnrollmentId = (id: string) => 'inspection-vehicle:' + id;
const prefix = inspectionEnrollmentId('');
export async function inspectionEnrollment() {
  const settings = await prisma.systemSetting.findMany({ where: { id: { startsWith: prefix } }, select: { id: true, alertEmail: true } });
  return new Map(settings.map(s => [s.id.slice(prefix.length), isInspectionCategory(s.alertEmail) ? s.alertEmail : null] as const));
}
export async function inspectionVehicleIds() { return new Set((await inspectionEnrollment()).keys()); }
export async function setInspectionEnrollment(vehicleId: string, enabled: boolean, category?: VehicleCategory) {
  const id = inspectionEnrollmentId(vehicleId);
  if (enabled) await prisma.systemSetting.upsert({ where: { id }, create: { id, alertEmail: category }, update: category ? { alertEmail: category } : {} });
  else await prisma.systemSetting.deleteMany({ where: { id } });
}
