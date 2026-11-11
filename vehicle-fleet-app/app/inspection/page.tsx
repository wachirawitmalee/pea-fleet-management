import Link from 'next/link';
import QRCode from 'qrcode';
import Dashboard from './dashboard-view';
import Icon from './inspection-icon';

export default async function InspectionPage() {
  const url = new URL('/inspection/field', process.env.NEXT_PUBLIC_APP_URL || 'https://pea-fleet-management.vercel.app').href;
  const qr = await QRCode.toDataURL(url, { width: 260, margin: 3, errorCorrectionLevel: 'M' });
  return <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <Link href="/" className="text-sm font-bold text-violet-700">← Smart Fleet Care</Link>
      <header className="mt-4 rounded-3xl border border-violet-100 bg-gradient-to-br from-white via-white to-violet-100 p-6 sm:p-8">
        <p className="text-xs font-bold tracking-widest text-violet-700">SMART FLEET CARE · สาขาระโนด</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Inspection</h1>
        <p className="mt-2 text-slate-700">ภาพรวมความพร้อมของรถและผลตรวจก่อนเริ่มงาน</p>
      </header>
    </div>
    {process.env.NODE_ENV === 'development' && process.env.FLEET_LOCAL_PREVIEW === 'true' && <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6"><Link href="/inspection/teams-preview" className="rounded-xl bg-indigo-100 px-4 py-2 text-sm font-bold text-indigo-900">ดูตัวอย่างการ์ด Teams</Link></div>}
    <Dashboard embedded />
    <section aria-label="ทางลัดหน้างาน" className="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
      <h2 className="text-lg font-bold">ทางลัดหน้างาน</h2>
      <nav aria-label="เมนูหน้างาน" className="mt-3 grid gap-3 sm:grid-cols-3">
          <Link href="/inspection/vehicle" className="group flex items-center gap-4 rounded-2xl border border-violet-100 bg-white p-4 text-slate-900 shadow-sm transition-colors hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-700">
            <span className="shrink-0 rounded-xl bg-violet-100 p-3 text-violet-800"><Icon name="car" /></span>
            <span className="min-w-0 flex-1"><span className="block font-extrabold">ตรวจสภาพยานพาหนะ</span><span className="mt-0.5 block text-xs text-slate-600">เปิดเช็กลิสต์และบันทึกผลตรวจรถ</span></span>
            <span aria-hidden="true" className="text-lg text-violet-700">→</span>
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
    </section>
    <section id="inspection-qr" className="mx-auto max-w-7xl px-4 pb-8 sm:px-6"><div className="flex flex-wrap items-center gap-6 rounded-2xl border border-slate-200 bg-white p-5"><img width={150} height={150} src={qr} alt="QR เปิดหน้าตรวจสำหรับช่าง" /><div><h2 className="font-bold">QR เดียวสำหรับทีมหน้างาน</h2><p className="my-2">สแกนเพื่อเปิดหน้าสำหรับช่าง มีเพียงสองเมนูตรวจ</p><a className="text-violet-700 underline" href={qr} download="smart-fleet-inspection.png">ดาวน์โหลด QR สำหรับพิมพ์</a><p className="mt-2 text-sm"><Link href="/inspection/field" className="font-semibold text-indigo-800 underline">เปิดหน้าสำหรับช่าง</Link></p></div></div></section>
  </div>;
}
