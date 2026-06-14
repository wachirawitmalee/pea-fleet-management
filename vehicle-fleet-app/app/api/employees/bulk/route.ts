import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employees } = body; // รับ Array ของพนักงาน

    if (!employees || !Array.isArray(employees)) {
      return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
    }

    // ใช้ Transaction เพื่อความปลอดภัย (ถ้าพลาดหนึ่งรายการ ให้ยกเลิกทั้งหมด)
    const results = await prisma.$transaction(
      employees.map((emp: any) =>
        prisma.employee.upsert({
          where: { employeeId: emp.employeeId.toString() },
          update: {
            fullName: emp.fullName,
            position: emp.position,
            department: emp.department,
            workPlace: emp.workPlace || "กฟส.ระโนด", // ค่าเริ่มต้นหากไม่มีข้อมูล
          },
          create: {
            employeeId: emp.employeeId.toString(),
            fullName: emp.fullName,
            position: emp.position,
            department: emp.department,
            workPlace: emp.workPlace || "กฟส.ระโนด",
          },
        })
      )
    );

    return NextResponse.json({ success: true, count: results.length });
  } catch (error: any) {
    console.error("Bulk Upload Error:", error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลพนักงาน' }, { status: 500 });
  }
}