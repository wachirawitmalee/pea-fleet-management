import Link from 'next/link';
import Icon from '../inspection-icon';

export default function FieldInspectionPage() {
  return <main className="min-h-screen bg-[#f5f7fb] px-4 py-10 text-slate-950">
    <div className="mx-auto max-w-xl">
      <p className="text-xs font-bold tracking-widest text-indigo-700">SMART FLEET CARE · สาขาระโนด</p>
      <h1 className="mt-2 text-3xl font-extrabold">ตรวจหน้างาน</h1>
      <p className="mt-2 text-slate-700">เลือกแบบตรวจ แล้วทำทีละขั้นบนมือถือ</p>
      <nav aria-label="เลือกแบบตรวจ" className="mt-6 grid gap-4">
        <Link href="/inspection/vehicle?from=field" className="flex min-h-24 items-center gap-4 rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm hover:bg-indigo-50">
          <span className="shrink-0 rounded-xl bg-indigo-100 p-3 text-indigo-800"><Icon name="car" /></span><span className="flex-1"><strong className="block text-lg">ตรวจสภาพยานพาหนะ</strong><span className="mt-1 inline-block rounded-full bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-900">3 ขั้น</span><span className="mt-2 block text-sm text-slate-600">ข้อมูลรถ → เช็กลิสต์ → หลักฐาน</span></span><span aria-hidden="true" className="text-indigo-800">→</span>
        </Link>
        <Link href="/inspection/pre-job?from=field" className="flex min-h-24 items-center gap-4 rounded-2xl border border-teal-200 bg-white p-5 shadow-sm hover:bg-teal-50">
          <span className="shrink-0 rounded-xl bg-teal-100 p-3 text-teal-800"><Icon name="list" /></span><span className="flex-1"><strong className="block text-lg">ตรวจก่อนเริ่มงาน</strong><span className="mt-1 inline-block rounded-full bg-teal-50 px-2 py-1 text-xs font-bold text-teal-900">5 ขั้น</span><span className="mt-2 block text-sm text-slate-600">ข้อมูลรถ → คนและงาน → ตรวจรถ → เครื่องมือ → หลักฐาน</span></span><span aria-hidden="true" className="text-teal-800">→</span>
        </Link>
      </nav>
    </div>
  </main>;
}
