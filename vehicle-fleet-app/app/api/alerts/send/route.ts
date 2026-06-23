import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

// บังคับไม่ให้จำค่าแคช เพื่อให้คำนวณวันหมดอายุใหม่เสมอ
export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // 1. ดึงอีเมลปลายทางจากระบบตั้งค่า
    const setting = await prisma.systemSetting.findUnique({
      where: { id: '1' }
    });

    if (!setting || !setting.alertEmail) {
      return NextResponse.json({ error: 'ไม่ได้ตั้งค่าอีเมลผู้รับแจ้งเตือนในระบบ' }, { status: 400 });
    }

    // 2. ดึงข้อมูลรถยนต์ทั้งหมดมาตรวจสอบสถานะ
    const vehicles = await prisma.vehicle.findMany();
    
    // ตั้งค่าเวลาเป็นเที่ยงคืนเป๊ะๆ ของวันนี้ เพื่อการลบจำนวนวันที่แม่นยำ
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alertsList: any[] = [];

    vehicles.forEach((vehicle: any) => {
      // ==========================================
      // 🔴 1. ตรวจสอบวันหมดอายุภาษี
      // (ดักจับทุกชื่อฟิลด์ที่เป็นไปได้ในฐานข้อมูลของคุณ)
      // ==========================================
      const taxDateValue = vehicle.taxExpireDate || vehicle.taxExpiryDate || vehicle.taxDate || vehicle.registrationExpireDate;
      
      if (taxDateValue) {
        const expiryDate = new Date(taxDateValue);
        expiryDate.setHours(0, 0, 0, 0);
        const diffTime = expiryDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          alertsList.push({ plate: vehicle.plateNumber, icon: '🔴', message: `ภาษีหมดอายุมาแล้ว ${Math.abs(diffDays)} วัน` });
        } else if (diffDays <= 30) {
          alertsList.push({ plate: vehicle.plateNumber, icon: '📅', message: `ภาษีจะหมดอายุในอีก ${diffDays} วัน` });
        }
      }

      // ==========================================
      // 🔴 2. ตรวจสอบเช็คระยะแบบ "จำนวนวัน"
      // ==========================================
      const serviceDateValue = vehicle.nextServiceDate || vehicle.serviceDueDate || vehicle.maintenanceDate;
      let serviceAlertTriggered = false;

      if (serviceDateValue) {
        const serviceDate = new Date(serviceDateValue);
        serviceDate.setHours(0, 0, 0, 0);
        const diffTime = serviceDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          alertsList.push({ plate: vehicle.plateNumber, icon: '🚨', message: `เกินกำหนดเช็คระยะมาแล้ว ${Math.abs(diffDays)} วัน` });
          serviceAlertTriggered = true;
        } else if (diffDays <= 30) {
          alertsList.push({ plate: vehicle.plateNumber, icon: '🛠️', message: `จะถึงกำหนดเช็คระยะในอีก ${diffDays} วัน` });
          serviceAlertTriggered = true;
        }
      }

      // ==========================================
      // 🔴 3. ตรวจสอบเช็คระยะแบบ "เลขไมล์" (ถ้าไม่ได้เตือนแบบวันไปแล้ว)
      // ==========================================
      if (!serviceAlertTriggered && vehicle.currentMileage && vehicle.nextServiceMileage) {
        if (vehicle.currentMileage >= vehicle.nextServiceMileage - 1000) {
          const diff = vehicle.nextServiceMileage - vehicle.currentMileage;
          if (diff <= 0) {
             alertsList.push({ plate: vehicle.plateNumber, icon: '🚨', message: `เกินกำหนดเช็คระยะมาแล้ว ${Math.abs(diff)} กม.` });
          } else {
             alertsList.push({ plate: vehicle.plateNumber, icon: '🛠️', message: `อีก ${diff} กม. จะถึงกำหนดเช็คระยะ` });
          }
        }
      }
    });

    // 🌟 ถ้าไม่มีข้อมูลที่เข้าเกณฑ์เลย ค่อยส่งสถานะปกติ
    if (alertsList.length === 0) {
      return NextResponse.json({ message: 'ยานพาหนะทุกคันอยู่ในสถานะปกติ ไม่จำเป็นต้องส่งอีเมล' });
    }

    // 3. ตั้งค่าการส่งอีเมลผ่าน Nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, 
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // 4. สร้างเนื้อหาอีเมลในรูปแบบ HTML (รวมใส่ตารางเดียวให้สวยงามและอ่านง่าย)
    let htmlContent = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #334155; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px;">
        <div style="background: #1e293b; padding: 20px; border-radius: 12px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 1.5rem;">🔔 รายงานแจ้งเตือนระบบยานพาหนะ</h2>
          <p style="margin: 5px 0 0 0; font-size: 0.85rem; color: #94a3b8;">ประจำวันที่ ${today.toLocaleDateString('th-TH')}</p>
        </div>
        
        <p style="font-size: 1rem; font-weight: bold; margin-top: 24px;">เรียน ผู้ดูแลระบบ,</p>
        <p style="font-size: 0.95rem; line-height: 1.5;">ระบบตรวจพบยานพาหนะที่มีกำหนดต้องชำระภาษีประจำปีหรือนำเข้าตรวจเช็คระยะ จำนวน <b>${alertsList.length} รายการ</b> ดังต่อไปนี้:</p>

        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 0.95rem; border: 1px solid #e2e8f0;">
          <thead>
            <tr style="background: #f8fafc; text-align: left;">
              <th style="padding: 12px; border-bottom: 2px solid #cbd5e1; color: #475569;">ทะเบียนรถ</th>
              <th style="padding: 12px; border-bottom: 2px solid #cbd5e1; color: #475569;">รายละเอียดการแจ้งเตือน</th>
            </tr>
          </thead>
          <tbody>
            ${alertsList.map((alert, index) => `
              <tr style="background: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #0f172a;">${alert.plate}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #b45309;">${alert.icon} ${alert.message}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 30px; padding-top: 15px; border-t: 1px solid #e2e8f0; font-size: 0.85rem; color: #64748b; text-align: center;">
          <p>ระบบส่งรายงานอัตโนมัติจากระบบบริหารจัดการกองยานพาหนะ การไฟฟ้าส่วนภูมิภาค สาขาระโนด</p>
        </div>
      </div>
    `;

    // 5. สั่งส่งอีเมลจริงออกไป
    await transporter.sendMail({
      from: `"PEA Fleet Alert" <${process.env.SMTP_USER}>`,
      to: setting.alertEmail,
      subject: `[แจ้งเตือน] พบยานพาหนะ ${alertsList.length} คัน ที่ต้องดำเนินการ - ${today.toLocaleDateString('th-TH')}`,
      html: htmlContent,
    });

    return NextResponse.json({ message: 'ส่งอีเมลแจ้งเตือนเรียบร้อยแล้ว' });
  } catch (error: any) {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการส่งอีเมล: ' + error.message }, { status: 500 });
  }
}