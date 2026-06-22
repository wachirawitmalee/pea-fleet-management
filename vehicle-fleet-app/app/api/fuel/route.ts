import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const vehicleId = searchParams.get('vehicleId');

    let whereClause: any = {};

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(`${startDate}T00:00:00.000Z`),
        lte: new Date(`${endDate}T23:59:59.999Z`),
      };
    }
    if (vehicleId) {
      whereClause.vehicleId = vehicleId;
    }

    const records = await prisma.fuelRecord.findMany({
      where: whereClause,
      include: { vehicle: true },
      orderBy: { date: 'desc' },
    });
    return NextResponse.json(records);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch fuel records' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newRecord = await prisma.fuelRecord.create({
      data: {
        date: new Date(body.date),
        vehicleId: body.vehicleId,
        mileage: parseInt(body.mileage),
        voucherVolume: body.voucherVolume,
        voucherNumber: body.voucherNumber,
        voucherDate: body.voucherDate ? new Date(body.voucherDate) : null,
        stationName: body.stationName,
        fuelType: body.fuelType,
        quantity: parseFloat(body.quantity),
        pricePerLiter: parseFloat(body.pricePerLiter),
        totalAmount: parseFloat(body.totalAmount),
        netAmount: parseFloat(body.netAmount),
        vatAmount: parseFloat(body.vatAmount),
      }
    });
    return NextResponse.json({ message: 'Success', data: newRecord }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create record' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const updatedRecord = await prisma.fuelRecord.update({
      where: { id: body.id },
      data: {
        date: new Date(body.date),
        vehicleId: body.vehicleId,
        mileage: parseInt(body.mileage),
        voucherVolume: body.voucherVolume,
        voucherNumber: body.voucherNumber,
        voucherDate: body.voucherDate ? new Date(body.voucherDate) : null,
        stationName: body.stationName,
        fuelType: body.fuelType,
        quantity: parseFloat(body.quantity),
        pricePerLiter: parseFloat(body.pricePerLiter),
        totalAmount: parseFloat(body.totalAmount),
        netAmount: parseFloat(body.netAmount),
        vatAmount: parseFloat(body.vatAmount),
      }
    });
    return NextResponse.json({ message: 'Success', data: updatedRecord });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await prisma.fuelRecord.delete({ where: { id } });
    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 });
  }
}