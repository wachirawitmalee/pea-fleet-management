import Link from 'next/link';
import QRCode from 'qrcode';

export default async function InspectionPage() {
  const url = new URL('/inspection', process.env.NEXT_PUBLIC_APP_URL || 'https://pea-fleet-management.vercel.app').href;
  const qr = await QRCode.toDataURL(url, { width: 260, margin: 3, errorCorrectionLevel: 'M' });
  return <main className="mx-auto max-w-5xl px-4 py-8 text-slate-900">
    <Link href="/" className="font-semibold text-violet-700">← หน้าหลัก</Link>
    <header className="my-6 rounded-3xl bg-slate-900 p-7 text-white"><p className="text-sm font-semibold text-violet-200">SMART FLEET CARE · สาขาระโนด</p><h1 className="mt-2 text-4xl font-bold">Inspection</h1><p className="mt-2 text-slate-200">ตรวจสภาพรถและความพร้อมก่อนเริ่มงาน</p></header>
    <div className="grid gap-4 sm:grid-cols-3">
      {[['/inspection/vehicle','ตรวจสภาพยานพาหนะ','บันทึกเช็กลิสต์ เลขไมล์ และรูปหลักฐาน'],['/inspection/pre-job','ตรวจก่อนเริ่มงาน','บันทึกความพร้อมของคน รถ และเครื่องมือ'],['/inspection/dashboard','แดชบอร์ดผลตรวจ','ติดตามรายวัน รายเดือน และรายคัน']].map(([href,title,desc]) => <Link key={href} href={href} className="rounded-2xl border bg-white p-5 shadow-sm hover:border-violet-600"><h2 className="font-bold text-violet-800">{title}</h2><p className="mt-2 text-sm text-slate-700">{desc}</p></Link>)}
    </div>
    <section className="mt-6 flex flex-wrap items-center gap-6 rounded-2xl border bg-white p-5"><img width={160} height={160} src={qr} alt="QR เปิดเมนู Inspection" /><div><h2 className="font-bold">QR เดียวสำหรับทีมหน้างาน</h2><p className="my-2">สแกนแล้วเลือกแบบตรวจ จากนั้นค้นหาทะเบียนรถหรือชื่อผู้ตรวจ</p><a className="text-violet-700 underline" href={qr} download="smart-fleet-inspection.png">ดาวน์โหลด QR สำหรับพิมพ์</a><p className="mt-2 break-all text-sm text-slate-600">{url}</p></div></section>
  </main>;
}
