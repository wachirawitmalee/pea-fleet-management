import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('id');

    if (!ticketId) {
      return NextResponse.json({ error: 'ไม่พบรหัสใบแจ้งซ่อม' }, { status: 400 });
    }

    // ดึงข้อมูลใบแจ้งซ่อม พร้อมป้ายทะเบียนรถ
    const ticket = await prisma.maintenanceTicket.findUnique({
      where: { ticketId },
      include: { vehicle: true }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลใบแจ้งซ่อมในระบบ' }, { status: 404 });
    }

    // ฟังก์ชันคำนวณหา "จำนวนวัน" ที่ต่างกัน
    const calcDur = (d1: Date | null, d2: Date | null) => {
      if (!d1 || !d2) return 0;
      const diffTime = Math.abs(new Date(d2).getTime() - new Date(d1).getTime());
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    };

    // ฟังก์ชันจัดรูปแบบวันที่ให้แสดงผลสวยงาม (DD/MM/YYYY)
    const fmt = (d: Date | null) => {
      if (!d) return "";
      return new Date(d).toLocaleDateString('th-TH');
    };

    const events = [];
    let lastDate = ticket.requestDate;

    // 1. จุดเริ่มต้น: วันที่กดแจ้งซ่อม
    events.push({ title: "แจ้งซ่อม", date: fmt(ticket.requestDate), days: 0, status: "done", icon: "📝" });

    // 2. เช็คสถานะการยกเลิก หรือ ดำเนินการต่อ
    if (ticket.status === 'ยกเลิกการซ่อม') {
       events.push({ title: "ยกเลิกการซ่อม", date: fmt(new Date()), days: 0, status: "cancel", icon: "❌" });
    } else {
       if (ticket.managerApproveDate) {
         const d = calcDur(lastDate, ticket.managerApproveDate);
         events.push({ title: "ผจก. อนุมัติ", date: fmt(ticket.managerApproveDate), days: d, status: "done", icon: "👤" });
         lastDate = ticket.managerApproveDate;
       }
       if (ticket.principleDate) {
         const d = calcDur(lastDate, ticket.principleDate);
         events.push({ title: "อนุมัติหลักการ", date: fmt(ticket.principleDate), days: d, status: "done", icon: "✅" });
         lastDate = ticket.principleDate;
       }
       if (ticket.poDate) {
         const d = calcDur(lastDate, ticket.poDate);
         events.push({ title: "PO Issued / สั่งจ้าง", date: fmt(ticket.poDate), days: d, status: "done", icon: "📄" });
         lastDate = ticket.poDate;
       }
       if (ticket.instructionDate) {
         const d = calcDur(lastDate, ticket.instructionDate);
         events.push({ title: "ผกส. สั่งนำรถเข้า", date: fmt(ticket.instructionDate), days: d, status: "done", icon: "📢" });
         lastDate = ticket.instructionDate;
       }
       if (ticket.partsReturnDate) {
         const d = calcDur(lastDate, ticket.partsReturnDate);
         events.push({ title: "ส่งคืนพัสดุชำรุด", date: fmt(ticket.partsReturnDate), days: d, status: "done", icon: "📦" });
         lastDate = ticket.partsReturnDate;
       }
       if (ticket.entryDate) {
         const d = calcDur(lastDate, ticket.entryDate);
         events.push({ title: "เข้าซ่อม (ถึงอู่)", date: fmt(ticket.entryDate), days: d, status: "done", icon: "🛠️" });
         lastDate = ticket.entryDate;
       }
       if (ticket.finishDate) {
         const d = calcDur(lastDate, ticket.finishDate);
         events.push({ title: "ซ่อมเสร็จ", date: fmt(ticket.finishDate), days: d, status: "done", icon: "✨" });
         lastDate = ticket.finishDate;
       }
       if (ticket.docReceiveDate) {
         const d = calcDur(lastDate, ticket.docReceiveDate);
         events.push({ title: "ผกส. รับเอกสาร", date: fmt(ticket.docReceiveDate), days: d, status: "done", icon: "📥" });
         lastDate = ticket.docReceiveDate;
       }
       if (ticket.sendFinanceDate) {
         const d = calcDur(lastDate, ticket.sendFinanceDate);
         events.push({ title: "ส่งเรื่องให้ ผสน.", date: fmt(ticket.sendFinanceDate), days: d, status: "done", icon: "📤" });
         lastDate = ticket.sendFinanceDate;
       }
       if (ticket.voucherDate) {
         const d = calcDur(lastDate, ticket.voucherDate);
         events.push({ title: "ออกใบสำคัญจ่าย", date: fmt(ticket.voucherDate), days: d, status: "done", icon: "🧾" });
         lastDate = ticket.voucherDate;
       }
       if (ticket.status === 'ปิดใบซ่อม') {
         events.push({ title: "ปิดงานสมบูรณ์", date: fmt(new Date()), days: 0, status: "done", icon: "🏁" });
       }
    }

    // คำนวณวันทำงานรวมทั้งหมด (ตั้งแต่แจ้งซ่อม จนถึงสเตปล่าสุด)
    const totalDays = calcDur(ticket.requestDate, lastDate);

    // ส่งข้อมูลทั้งหมดกลับไปเป็น JSON ให้หน้าบ้านเอาไปวาดกราฟิก
    return NextResponse.json({
      success: true,
      ticketNumber: ticket.ticketNumber,
      plateNumber: ticket.vehicle.plateNumber,
      totalDays,
      events,
      adminNote: ticket.adminNote
    });

  } catch (error) {
    console.error("Timeline Fetch Error:", error);
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูล Timeline ได้' }, { status: 500 });
  }
}