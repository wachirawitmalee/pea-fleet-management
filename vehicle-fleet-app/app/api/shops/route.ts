import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1. GET: ดึงข้อมูลร้านค้าทั้งหมด
export async function GET() {
  try {
    const shops = await prisma.shop.findMany({
      orderBy: { shopName: 'asc' }
    });
    return NextResponse.json(shops);
  } catch (error) {
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลร้านค้าได้' }, { status: 500 });
  }
}

// 2. POST: เพิ่มร้านค้าใหม่
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { shopName, address, phone, serviceType, note } = body;

    if (!shopName) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อร้านค้า/อู่ซ่อม' }, { status: 400 });
    }

    const newShop = await prisma.shop.create({
      data: { shopName, address, phone, serviceType, note }
    });

    return NextResponse.json({ success: true, data: newShop }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'ชื่อร้านค้านี้มีอยู่ในระบบแล้ว' }, { status: 400 });
    }
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' }, { status: 500 });
  }
}

// 3. PUT: แก้ไขข้อมูลร้านค้า
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { shopId, shopName, address, phone, serviceType, note } = body;

    const updatedShop = await prisma.shop.update({
      where: { shopId },
      data: { shopName, address, phone, serviceType, note }
    });

    return NextResponse.json({ success: true, data: updatedShop });
  } catch (error) {
    return NextResponse.json({ error: 'ไม่สามารถแก้ไขข้อมูลร้านค้าได้' }, { status: 500 });
  }
}

// 4. DELETE: ลบร้านค้า
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('id');

    if (!shopId) {
      return NextResponse.json({ error: 'ไม่พบรหัสร้านค้า' }, { status: 400 });
    }

    await prisma.shop.delete({
      where: { shopId }
    });

    return NextResponse.json({ success: true, message: 'ลบร้านค้าสำเร็จ' });
  } catch (error) {
    return NextResponse.json({ error: 'ไม่สามารถลบร้านค้านี้ได้ เนื่องจากอาจมีประวัติผูกกับใบแจ้งซ่อมอยู่' }, { status: 500 });
  }
}