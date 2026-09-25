import { withStorage } from '@/lib/storage/sheets';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';




// ดึงค่าอีเมลปัจจุบัน
export async function GET() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { id: '1' }
    });

    return NextResponse.json(setting || { id: '1', alertEmail: '' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// อัปเดตหรือบันทึกอีเมลใหม่
async function handlePOST(request: Request) {
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
export const POST = withStorage(handlePOST);
