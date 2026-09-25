import { withStorage } from '@/lib/storage/sheets';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';




export async function GET() {
  try {
    const vehicles = await prisma.vehicle.findMany({ orderBy: { plateNumber: 'asc' } });
    return NextResponse.json(vehicles);
  } catch (error) {
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลรถยนต์ได้' }, { status: 500 });
  }
}

async function handlePOST(request: Request) {
  try {
    const body = await request.json();
    const { plateNumber, brand, model, year, type, department, vehicleStatus, qrCodeData, isBookable, taxExpireDate, nextCheckDate, nextCheckMileage, currentMileage } = body;

    const vehicle = await prisma.vehicle.create({
      data: {
        plateNumber, brand, model, year, type, department, vehicleStatus, qrCodeData,
        isBookable: isBookable ?? true,
        taxExpireDate: taxExpireDate ? new Date(taxExpireDate) : null,
        nextCheckDate: nextCheckDate ? new Date(nextCheckDate) : null,
        nextCheckMileage: nextCheckMileage ? parseInt(nextCheckMileage) : null,
        currentMileage: currentMileage ? parseInt(currentMileage) : 0,
      }
    });
    return NextResponse.json({ success: true, data: vehicle }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'ไม่สามารถเพิ่มข้อมูลรถยนต์ได้' }, { status: 500 });
  }
}

async function handlePUT(request: Request) {
  try {
    const body = await request.json();
    const { vehicleId, plateNumber, brand, model, year, type, department, vehicleStatus, qrCodeData, isBookable, taxExpireDate, nextCheckDate, nextCheckMileage, currentMileage } = body;

    const vehicle = await prisma.vehicle.update({
      where: { vehicleId },
      data: {
        plateNumber, brand, model, year, type, department, vehicleStatus, qrCodeData,
        isBookable: isBookable ?? true,
        taxExpireDate: taxExpireDate ? new Date(taxExpireDate) : null,
        nextCheckDate: nextCheckDate ? new Date(nextCheckDate) : null,
        nextCheckMileage: nextCheckMileage ? parseInt(nextCheckMileage) : null,
        currentMileage: currentMileage !== undefined && currentMileage !== null ? parseInt(currentMileage) : undefined,
      }
    });
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
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'ไม่สามารถลบรถยนต์ได้ เนื่องจากมีประวัติการจองผูกอยู่' }, { status: 500 });
  }
}
export const POST = withStorage(handlePOST);

export const PUT = withStorage(handlePUT);

export const DELETE = withStorage(handleDELETE);
