import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';
const prisma = new PrismaClient();

export async function GET() {
  try {
    const employees = await prisma.employee.findMany({ orderBy: { employeeId: 'asc' } });
    return NextResponse.json(employees);
  } catch (error) {
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลพนักงานได้' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, fullName, position, department, workPlace } = body;
    
    // ตรวจสอบว่ามีรหัสนี้อยู่แล้วหรือไม่
    const existing = await prisma.employee.findUnique({ where: { employeeId } });
    if (existing) return NextResponse.json({ error: 'รหัสพนักงานนี้มีอยู่ในระบบแล้ว' }, { status: 400 });

    const employee = await prisma.employee.create({
      data: { 
        employeeId, fullName, position, department, 
        workPlace: workPlace || "กฟส.ระโนด", 
        status: "ACTIVE" 
      }
    });
    return NextResponse.json({ success: true, data: employee }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการเพิ่มพนักงาน: ' + error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, fullName, position, department, workPlace, status } = body;

    if (!employeeId) return NextResponse.json({ error: 'ไม่พบรหัสพนักงาน' }, { status: 400 });

    const employee = await prisma.employee.update({
      where: { employeeId: employeeId },
      data: { 
        fullName, 
        position, 
        department, 
        workPlace: workPlace || "กฟส.ระโนด",
        // ถ้าไม่มีการส่ง status มาให้ใช้ค่าเดิม (เพื่อป้องกัน Error)
        status: status !== undefined ? status : undefined 
      }
    });
    return NextResponse.json({ success: true, data: employee });
  } catch (error: any) {
    console.error("Update Error:", error);
    return NextResponse.json({ error: 'ไม่สามารถอัปเดตข้อมูลพนักงานได้: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ไม่พบรหัสพนักงาน' }, { status: 400 });

    // เปลี่ยนเป็น Soft Delete (ปรับสถานะเป็น INACTIVE)
    await prisma.employee.update({
      where: { employeeId: id },
      data: { status: 'INACTIVE' }
    });

    return NextResponse.json({ success: true, message: 'ระงับสิทธิ์เรียบร้อย' });
  } catch (error: any) {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด: ' + error.message }, { status: 500 });
  }
}