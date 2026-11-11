import { prisma } from './prisma';

export const inspectionEnrollmentId = (id: string) => 'inspection-vehicle:' + id;
const prefix = inspectionEnrollmentId('');
export async function inspectionVehicleIds() {
  const settings = await prisma.systemSetting.findMany({ where: { id: { startsWith: prefix } }, select: { id: true } });
  return new Set(settings.map(s => s.id.slice(prefix.length)));
}
export async function setInspectionEnrollment(vehicleId: string, enabled: boolean) {
  const id = inspectionEnrollmentId(vehicleId);
  if (enabled) await prisma.systemSetting.upsert({ where: { id }, create: { id }, update: {} });
  else await prisma.systemSetting.deleteMany({ where: { id } });
}
