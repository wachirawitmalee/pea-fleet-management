import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { adminCookie, readAdmin } from '@/lib/admin-auth';
import { googleCall } from '@/lib/storage/google';
import { inspectionCategoryLabel, type InspectionDetail } from '@/lib/inspection';
import PrintButton from '../../print-button';

export default async function PrintInspection({ params }: { params: Promise<{id:string}> }) {
  const jar = await cookies();
  if (!await readAdmin(jar.get(adminCookie)?.value)) redirect('/admin');
  const {id}=await params;
  if (!/^[\w-]{1,100}$/.test(id)) notFound();
  const row=await googleCall<InspectionDetail|null>('inspection-detail',{id});
  if (!row || row.kind !== 'vehicle') notFound();
  const answers=row.answers as {mileage?:number;items?:{label:string;status:string;note?:string}[]};
  const abnormal = !row.ready || row.failures.length > 0;
  return <main className="mx-auto max-w-6xl bg-white p-6 text-slate-950 print:max-w-none print:p-0">
    <style>{'@page { size: A4 landscape; margin: 12mm; }'}</style>
    <nav className="mb-5 flex items-center justify-between gap-4 print:hidden"><Link href="/admin/inspection" className="font-bold text-indigo-800">← Inspection สำหรับแอดมิน</Link><PrintButton /></nav>
    <p className="mb-4 text-xs text-slate-600 print:hidden">ปิด «ส่วนหัวและส่วนท้าย» ในหน้าพิมพ์เพื่อซ่อน URL</p>
    <article>
      <header className="border-b-2 border-slate-800 pb-4"><p className="text-sm font-bold">Smart Fleet Care · การไฟฟ้าส่วนภูมิภาค</p><h1 className="mt-1 text-2xl font-extrabold">ใบตรวจสภาพยานพาหนะ</h1><p className="mt-1 text-sm">เลขอ้างอิง: {row.id}</p></header>
      <dl className="my-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-3 print:grid-cols-3">
        <div><dt className="font-bold">ทะเบียนรถ</dt><dd>{row.plate}</dd></div><div><dt className="font-bold">วันที่ตรวจ</dt><dd>{new Date(row.date+'T00:00:00+07:00').toLocaleDateString('th-TH',{timeZone:'Asia/Bangkok'})}</dd></div>
        <div><dt className="font-bold">ประเภทแบบตรวจ</dt><dd>{inspectionCategoryLabel[row.category] ?? row.category}</dd></div><div><dt className="font-bold">เลขไมล์</dt><dd>{answers?.mileage ?? '—'} กม.</dd></div>
        <div><dt className="font-bold">ผู้ตรวจ</dt><dd>{row.inspector.name}</dd></div><div><dt className="font-bold">ผลตรวจ</dt><dd className={abnormal ? 'font-bold text-rose-900' : 'font-bold text-teal-900'}>{abnormal ? 'พบความผิดปกติ' : 'พร้อมใช้งาน'}</dd></div>
      </dl>
      {abnormal && <section className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-950">
        <h2 className="font-bold">รายการผิดปกติที่พบ</h2>
        {row.failures.length ? <ul className="mt-1 list-disc pl-5">{row.failures.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p>ดูผลและหมายเหตุในตารางตรวจด้านล่าง</p>}
      </section>}
      {answers?.items?.length ? <table className="w-full border-collapse text-left text-sm"><thead><tr>{['ข้อ','รายการตรวจ','ผล','หมายเหตุ'].map(h=><th key={h} className="border border-slate-300 bg-slate-100 p-2">{h}</th>)}</tr></thead><tbody>{answers.items.map((item,i)=><tr key={i} className="break-inside-avoid"><td className="border p-2">{i+1}</td><td className="border p-2">{item.label}</td><td className="border p-2">{item.status==='pass'?'ปกติ':'ผิดปกติ'}</td><td className="border p-2">{item.note||'—'}</td></tr>)}</tbody></table> : <p>รายการนี้ไม่มีเช็กลิสต์รายข้อที่บันทึกไว้</p>}
      {row.note&&<p className="my-4 whitespace-pre-wrap">หมายเหตุ: {row.note}</p>}
      {row.photoId&&<div className="mt-4 break-inside-avoid"><p className="font-bold">รูปหลักฐาน</p><img className="mt-2 max-h-64 max-w-full object-contain" src={'/api/inspection?mode=photo&id='+encodeURIComponent(row.id)} alt="รูปหลักฐาน" /></div>}
    </article>
  </main>;
}
