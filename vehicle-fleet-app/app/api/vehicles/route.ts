import { fleetBranch } from '@/lib/fleet-branches';
import { vehicleBranches, setVehicleBranch, vehicleBranchKey } from '@/lib/vehicle-branches';
import { inspectionVehicleIds, setInspectionEnrollment } from '@/lib/inspection-enrollment';
import { currentVehicles } from '@/lib/current-vehicles';
import { parseMileage } from '@/lib/vehicle-mileage';
import { withStorage } from '@/lib/storage/sheets';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';




export async function GET() {
  try {
    const [vehicles, enrolled, branches] = await Promise.all([currentVehicles(), inspectionVehicleIds(), vehicleBranches()]);
    return NextResponse.json(vehicles.map(v => ({ ...v, branch: fleetBranch(branches.get(v.vehicleId)), inspectionEnabled: enrolled.has(v.vehicleId) })));
  } catch (error) {
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลรถยนต์ได้' }, { status: 500 });
  }
}

async function handlePOST(request: Request) {
  try {
    const body = await request.json();
    const { plateNumber, brand, model, year, type, department, vehicleStatus, qrCodeData, isBookable, taxExpireDate, nextCheckDate, nextCheckMileage, currentMileage } = body;

    const parsedMileage = currentMileage == null ? 0 : parseMileage(currentMileage);
    if (parsedMileage === null) return NextResponse.json({ error: 'เลขไมล์ต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป' }, { status: 400 });
    const vehicle = await prisma.vehicle.create({
      data: {
        plateNumber, brand, model, year, type, department, vehicleStatus, qrCodeData,
        isBookable: isBookable ?? true,
        taxExpireDate: taxExpireDate ? new Date(taxExpireDate) : null,
        nextCheckDate: nextCheckDate ? new Date(nextCheckDate) : null,
        nextCheckMileage: nextCheckMileage ? parseInt(nextCheckMileage) : null,
        currentMileage: parsedMileage,
      }
    });
    await setVehicleBranch(vehicle.vehicleId, body.branch);
    if (body.inspectionEnabled === true) await setInspectionEnrollment(vehicle.vehicleId, true);
    return NextResponse.json({ success: true, data: vehicle }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'ไม่สามารถเพิ่มข้อมูลรถยนต์ได้' }, { status: 500 });
  }
}

async function handlePUT(request: Request) {
  try {
    const body = await request.json();
    const { vehicleId, plateNumber, brand, model, year, type, department, vehicleStatus, qrCodeData, isBookable, taxExpireDate, nextCheckDate, nextCheckMileage, currentMileage } = body;

    if (!vehicleId) return NextResponse.json({ error: 'กรุณาระบุรถยนต์' }, { status: 400 });
    const [existing] = await currentVehicles(vehicleId);
    if (!existing) return NextResponse.json({ error: 'ไม่พบรถยนต์' }, { status: 404 });
    const parsedMileage = currentMileage == null ? existing.currentMileage : parseMileage(currentMileage);
    if (parsedMileage === null) return NextResponse.json({ error: 'เลขไมล์ต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป' }, { status: 400 });
    const vehicle = await prisma.vehicle.update({
      where: { vehicleId },
      data: {
        plateNumber, brand, model, year, type, department, vehicleStatus, qrCodeData,
        isBookable: isBookable ?? true,
        taxExpireDate: taxExpireDate ? new Date(taxExpireDate) : null,
        nextCheckDate: nextCheckDate ? new Date(nextCheckDate) : null,
        nextCheckMileage: nextCheckMileage ? parseInt(nextCheckMileage) : null,
        currentMileage: parsedMileage,
      }
    });
    if (body.branch !== undefined) await setVehicleBranch(vehicleId, body.branch);
    if (typeof body.inspectionEnabled === 'boolean') await setInspectionEnrollment(vehicleId, body.inspectionEnabled);
    return NextResponse.json({ success: true, data: vehicle });
  } catch (error) {
    return NextResponse.json({ error: 'ไม่สามารถอัปเดตข้อมูลรถยนต์ได้' }, { status: 500 });
  }
}

async function handleDELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ไม่พบรหัสรถยนต์' }, { status: 400 });

    await prisma.vehicle.delete({ where: { vehicleId: id } });
    await setInspectionEnrollment(id, false);
    await prisma.systemSetting.deleteMany({ where: { id: vehicleBranchKey(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'ไม่สามารถลบรถยนต์ได้ เนื่องจากมีประวัติการจองผูกอยู่' }, { status: 500 });
  }
}
export const POST = withStorage(handlePOST);

export const PUT = withStorage(handlePUT);

export const DELETE = withStorage(handleDELETE);
