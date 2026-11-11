import Link from 'next/link';
import { notFound } from 'next/navigation';
import { googleCall } from '@/lib/storage/google';
import { vehicleBranches } from '@/lib/vehicle-branches';
import { inspectionVehicleIds } from '@/lib/inspection-enrollment';
import { branches, fleetBranch } from '@/lib/fleet-branches';
import { prisma } from '@/lib/prisma';
import { thaiInspectionDay, type InspectionRow } from '@/lib/inspection';
export const dynamic='force-dynamic';
export default async function TeamsPreview(){
  if(process.env.NODE_ENV!=='development'||process.env.FLEET_LOCAL_PREVIEW!=='true')notFound();
  const day=thaiInspectionDay();
  const [records,cars,enrolled,assigned]=await Promise.all([googleCall<InspectionRow[]>('inspection-summary',{period:day}),prisma.vehicle.findMany(),inspectionVehicleIds(),vehicleBranches()]);
  const checked=new Set(records.filter(r=>r.kind==='vehicle').map(r=>r.vehicleId));
  const fleet=cars.filter(v=>enrolled.has(v.vehicleId));
  const done=fleet.filter(v=>checked.has(v.vehicleId)).length;
  const last=records.at(-1);
  return <main className="mx-auto max-w-3xl space-y-5 p-5 text-slate-900">
    <Link href="/inspection" className="font-bold text-indigo-700">← Inspection</Link>
    <h1 className="text-3xl font-extrabold">ตัวอย่างการ์ด Teams</h1>
    <p className="rounded-xl bg-amber-50 p-3">ใช้ข้อมูลทดลอง · ยังไม่ส่งเข้าช่อง Teams จริง</p>
    <section className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold text-indigo-800">📋 สรุปตรวจสภาพรถช่วงบ่าย</h2><p className="my-2 text-sm text-slate-600">{day} · รอบ 14:00 น. เวลาไทย</p>
      <div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-teal-50 p-3 font-bold text-teal-900">✅ ตรวจแล้ว {done} คัน</div><div className="rounded-xl bg-amber-50 p-3 font-bold text-amber-950">⏳ ยังไม่ตรวจ {fleet.length-done} คัน</div></div>
      {branches.map(branch=>{const cars=fleet.filter(v=>fleetBranch(assigned.get(v.vehicleId))===branch),missing=cars.filter(v=>!checked.has(v.vehicleId));return <div key={branch} className="mt-4 border-t border-slate-200 pt-3"><h3 className="font-bold text-indigo-800">🚙 {branch}</h3><p>ตรวจแล้ว {cars.length-missing.length} / {cars.length} คัน · ยังไม่ตรวจ {missing.length} คัน</p>{missing.length>0&&<p className="text-sm text-slate-600">{missing.map(v=>v.plateNumber).join(', ')}</p>}</div>;})}
    </section>
    {last&&<section className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm"><h2 className="text-xl font-bold text-indigo-800">{last.kind==='vehicle'?'🚙 บันทึกผลตรวจสภาพรถ':'🛠️ บันทึกผลตรวจก่อนเริ่มงาน'}</h2><p className="my-2 text-sm text-slate-600">{fleetBranch(assigned.get(last.vehicleId))} · {last.date}</p><p>ทะเบียน: {last.plate}</p><p>ผลตรวจ: {last.ready?'✅ พร้อม':'⚠️ พบปัญหา'}</p>{last.kind==='pre-job'&&<p>การอนุมัติ: รออนุมัติเมื่อบันทึก</p>}{last.failures.length>0&&<p>ข้อที่ต้องติดตาม: {last.failures.join(' · ')}</p>}</section>}
  </main>;
}
