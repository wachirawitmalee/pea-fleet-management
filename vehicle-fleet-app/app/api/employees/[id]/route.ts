import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// กฎใหม่ Next.js 15: params จะถูกมองเป็น Promise
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    // ต้องใส่ await เพื่อแกะค่า id ออกมาจาก params
    const { id } = await params; 
    const employeeId = id;

    // สั่งให้ Prisma ไปค้นหาพนักงานในฐานข้อมูล
    const employee = await prisma.employee.findUnique({
      where: { employeeId: employeeId },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'ไม่พบข้อมูลพนักงานในระบบ' },
        { status: 404 }
      );
    }

    return NextResponse.json(employee);
    
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    );
  }
}