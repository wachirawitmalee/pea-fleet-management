import { prisma } from './prisma';
import { fleetBranch } from './fleet-branches';

export const vehicleBranchKey = (id: string) => 'vehicle-branch:' + id;
export async function vehicleBranches() {
  const records = await prisma.systemSetting.findMany({where:{id:{startsWith:vehicleBranchKey('')}}});
  return new Map(records.map(r => [r.id.slice(vehicleBranchKey('').length), fleetBranch(r.alertEmail)]));
}
export async function setVehicleBranch(id: string, value: unknown) {
  const key = vehicleBranchKey(id), branch = fleetBranch(value);
  await prisma.systemSetting.upsert({where:{id:key},create:{id:key,alertEmail:branch},update:{alertEmail:branch}});
}
