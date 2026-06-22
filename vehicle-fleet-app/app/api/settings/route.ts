import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ดึงค่าอีเมลปัจจุบัน
export async function GET() {
  try {
    let setting = await prisma.systemSetting.findUnique({
      where: { id: '1' }
    });

    // ถ้ายังไม่มีแถวตั้งค่าในระบบ ให้สร้างแถวเริ่มต้นขึ้นมา
    if (!setting) {
      setting = await prisma.systemSetting.create({
        data: { id: '1', alertEmail: '' }
      });
    }

    return NextResponse.json(setting);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// อัปเดตหรือบันทึกอีเมลใหม่
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const updatedSetting = await prisma.systemSetting.upsert({
      where: { id: '1' },
      update: { alertEmail: body.alertEmail },
      create: { id: '1', alertEmail: body.alertEmail }
    });

    return NextResponse.json({ message: 'Settings updated successfully', data: updatedSetting });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}