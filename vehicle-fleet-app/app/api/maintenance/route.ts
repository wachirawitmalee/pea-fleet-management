import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const tickets = await prisma.maintenanceTicket.findMany({
      include: { vehicle: true, employee: true, shop: true },
      orderBy: { requestDate: 'desc' }
    });
    return NextResponse.json(tickets);
  } catch (error) {
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลใบแจ้งซ่อมได้' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vehicleId, employeeId, issueDesc, mileage, requestDate } = body;

    if (!vehicleId || !employeeId || !issueDesc || !mileage) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลสำคัญให้ครบถ้วน' }, { status: 400 });
    }

    const yearSuffix = new Date().getFullYear().toString().slice(-2);
    const prefix = `R${yearSuffix}-`;

    const allTickets = await prisma.maintenanceTicket.findMany({
      where: { ticketNumber: { startsWith: prefix } },
      select: { ticketNumber: true }
    });

    let maxNum = 0;
    allTickets.forEach(t => {
      const numPart = parseInt(t.ticketNumber.split('-')[1]);
      if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
    });
    const nextNumStr = String(maxNum + 1).padStart(4, '0');
    const autoTicketNumber = `${prefix}${nextNumStr}`;

    const newTicket = await prisma.maintenanceTicket.create({
      data: {
        ticketNumber: autoTicketNumber, vehicleId, employeeId, issueDesc,
        mileage: parseInt(mileage), requestDate: requestDate ? new Date(requestDate) : new Date(),
        status: "รอตรวจสอบ"
      }
    });

    await prisma.vehicle.update({ where: { vehicleId }, data: { vehicleStatus: 'MAINTENANCE' } });

    return NextResponse.json({ success: true, data: newTicket }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสร้างใบแจ้งซ่อม' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    // 🌟 รับค่า shopName มาจากการพิมพ์เอง
    const { ticketId, status, shopId, shopName, vehicleId, ...workflowData } = body;

    let finalShopId = shopId || null;

    // 🌟 ถ้ายูสเซอร์พิมพ์ชื่อร้านค้ามาเอง ระบบจะค้นหาว่ามีไหม ถ้าไม่มีจะสร้างให้ใหม่
    if (shopName && shopName.trim() !== '') {
      const existingShop = await prisma.shop.findUnique({ where: { shopName: shopName.trim() } });
      if (existingShop) {
        finalShopId = existingShop.shopId;
      } else {
        const newShop = await prisma.shop.create({ data: { shopName: shopName.trim() } });
        finalShopId = newShop.shopId;
      }
    }

    const cleanedData: any = { status, shopId: finalShopId };
    for (const key in workflowData) {
      if (workflowData[key] === "") cleanedData[key] = null;
      else if (key.endsWith('Date')) cleanedData[key] = new Date(workflowData[key]);
      else if (key === 'cost') cleanedData[key] = parseFloat(workflowData[key]);
      else cleanedData[key] = workflowData[key];
    }

    const updatedTicket = await prisma.maintenanceTicket.update({
      where: { ticketId }, data: cleanedData
    });

    if (status === 'ปิดใบซ่อม' || status === 'ยกเลิกการซ่อม') {
      if (vehicleId) {
        await prisma.vehicle.update({ where: { vehicleId }, data: { vehicleStatus: 'AVAILABLE' } });
      }
    }

    return NextResponse.json({ success: true, data: updatedTicket });
  } catch (error) {
    return NextResponse.json({ error: 'ไม่สามารถอัปเดตใบแจ้งซ่อมได้' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('id');
    const vehicleId = searchParams.get('vId');

    if (!ticketId) return NextResponse.json({ error: 'ไม่พบรหัสใบแจ้งซ่อม' }, { status: 400 });

    await prisma.maintenanceTicket.delete({ where: { ticketId } });

    if (vehicleId) {
      await prisma.vehicle.update({ where: { vehicleId }, data: { vehicleStatus: 'AVAILABLE' } });
    }

    return NextResponse.json({ success: true, message: 'ลบใบแจ้งซ่อมสำเร็จ' });
  } catch (error) {
    return NextResponse.json({ error: 'ไม่สามารถลบใบแจ้งซ่อมนี้ได้' }, { status: 500 });
  }
}