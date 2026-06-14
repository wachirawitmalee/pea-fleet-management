import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 เริ่มต้นการนำเข้าข้อมูล (Seeding)...')

  // 1. สร้างข้อมูลพนักงานตั้งต้น
  await prisma.employee.upsert({
    where: { employeeId: '567890' },
    update: {},
    create: {
      employeeId: '567890',
      fullName: 'Wachirawit Malee',
      position: 'พนักงานช่าง ระดับ 6',
      department: 'แผนกปฏิบัติการและบำรุงรักษา',
      workPlace: 'สาขาระโนด',
      role: 'SYSTEM_ADMIN', // ให้สิทธิ์เป็น Admin สูงสุด
    },
  })

  await prisma.employee.upsert({
    where: { employeeId: '123456' },
    update: {},
    create: {
      employeeId: '123456',
      fullName: 'สมชาย ใจดี',
      position: 'วิศวกรไฟฟ้า',
      department: 'แผนกก่อสร้าง',
      workPlace: 'สาขาระโนด',
      role: 'USER',
    },
  })

  // 2. สร้างข้อมูลรถยนต์ตั้งต้น
  await prisma.vehicle.upsert({
    where: { plateNumber: 'กข 1234 สงขลา' },
    update: {},
    create: {
      plateNumber: 'กข 1234 สงขลา',
      brand: 'Toyota Hilux Revo (ตอนเดียว)',
      vehicleStatus: 'AVAILABLE',
      qrCodeData: 'QR_REVO_1234',
    },
  })

  await prisma.vehicle.upsert({
    where: { plateNumber: 'ขค 9876 กทม.' },
    update: {},
    create: {
      plateNumber: 'ขค 9876 กทม.',
      brand: 'Honda HR-V',
      vehicleStatus: 'AVAILABLE',
      qrCodeData: 'QR_HRV_9876',
    },
  })

  console.log('✅ นำเข้าข้อมูลสำเร็จเรียบร้อย!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })