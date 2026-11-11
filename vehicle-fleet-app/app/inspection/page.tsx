import Link from 'next/link';
import QRCode from 'qrcode';
import Dashboard from './dashboard-view';
import Icon from './inspection-icon';

export default async function InspectionPage() {
  const url = new URL('/inspection', process.env.NEXT_PUBLIC_APP_URL || 'https://pea-fleet-management.vercel.app').href;
  const qr = await QRCode.toDataURL(url, { width: 260, margin: 3, errorCorrectionLevel: 'M' });
  return <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <Link href="/" className="text-sm font-bold text-violet-700">← Smart Fleet Care</Link>
      <header className="mt-4 rounded-3xl border border-violet-100 bg-gradient-to-br from-white via-white to-violet-100 p-6 sm:p-8">
        <p className="text-xs font-bold tracking-widest text-violet-700">SMART FLEET CARE · สาขาระโนด</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Inspection</h1>
        <p className="mt-2 text-slate-700">ภาพรวมความพร้อมของรถและผลตรวจก่อนเริ่มงาน</p>
        <nav aria-label="เมนูหน้างาน" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr]">
          <Link href="/inspection/vehicle" className="group flex items-center gap-4 rounded-2xl bg-violet-700 p-4 text-white shadow-sm transition-colors hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-700 sm:col-span-2 lg:col-span-1">
            <span className="shrink-0 rounded-xl bg-white/15 p-3"><Icon name="car" /></span>
            <span className="min-w-0 flex-1"><span className="block font-extrabold">ตรวจสภาพยานพาหนะ</span><span className="mt-0.5 block text-xs text-violet-100">เปิดเช็กลิสต์และบันทึกผลตรวจรถ</span></span>
            <span aria-hidden="true" className="text-lg">→</span>
          </Link>
          <Link href="/inspection/pre-job" className="group flex items-center gap-4 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm transition-colors hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700">
            <span className="shrink-0 rounded-xl bg-teal-100 p-3 text-teal-800"><Icon name="list" /></span>
            <span className="min-w-0 flex-1"><span className="block font-extrabold text-slate-900">ตรวจก่อนเริ่มงาน</span><span className="mt-0.5 block text-xs text-slate-600">ตรวจความพร้อมคน รถ และเครื่องมือ</span></span>
            <span aria-hidden="true" className="text-lg text-teal-700">→</span>
          </Link>
          <a href="#inspection-qr" className="group flex items-center gap-4 rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm transition-colors hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-700">
            <span className="shrink-0 rounded-xl bg-indigo-100 p-3 text-indigo-800"><Icon name="qr" /></span>
            <span className="min-w-0 flex-1"><span className="block font-extrabold text-slate-900">QR หน้างาน</span><span className="mt-0.5 block text-xs text-slate-600">เปิดและดาวน์โหลด QR สำหรับพิมพ์</span></span>
            <span aria-hidden="true" className="text-lg text-indigo-700">↓</span>
          </a>
        </nav>
      </header>
    </div>
    <Dashboard embedded />
    <section id="inspection-qr" className="mx-auto max-w-7xl px-4 pb-8 sm:px-6"><div className="flex flex-wrap items-center gap-6 rounded-2xl border border-slate-200 bg-white p-5"><img width={150} height={150} src={qr} alt="QR เปิดเมนู Inspection" /><div><h2 className="font-bold">QR เดียวสำหรับทีมหน้างาน</h2><p className="my-2">สแกนแล้วเลือกแบบตรวจ จากนั้นค้นหาทะเบียนรถหรือชื่อผู้ตรวจ</p><a className="text-violet-700 underline" href={qr} download="smart-fleet-inspection.png">ดาวน์โหลด QR สำหรับพิมพ์</a><p className="mt-2 break-all text-sm text-slate-600">{url}</p></div></div></section>
  </div>;
}
