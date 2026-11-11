'use client';
import { useState, type FormEvent } from 'react';
import type { InspectionKind } from '@/lib/inspection';
import { Spinner } from './loading-ui';
import Icon from './inspection-icon';

type Entry = { name: string; count: number };
export default function InspectionRanking({ period, kind }: { period: string; kind: InspectionKind }) {
  const [rows, setRows] = useState<Entry[] | null>(null);
  const [sort, setSort] = useState('desc');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function load(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = new FormData(e.currentTarget);
    setBusy(true); setError('');
    try {
      const r = await fetch('/api/inspection?' + new URLSearchParams({mode:'ranking',period,kind}), {headers:{authorization:'Bearer '+String(form.get('key')).trim(),'x-inspection-employee':String(form.get('employee')).trim()}});
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'โหลดอันดับไม่สำเร็จ');
      setRows(data);
    } catch(e) { setError(e instanceof Error ? e.message : 'โหลดอันดับไม่สำเร็จ'); }
    finally { setBusy(false); }
  }
  const ranked = [...(rows ?? [])].sort((a,b) => (sort==='desc' ? b.count-a.count : a.count-b.count) || a.name.localeCompare(b.name,'th'));
  return <section className="rounded-2xl border border-slate-200 bg-white p-5">
    <h2 className="flex items-center gap-2 text-lg font-bold"><Icon name="chart" /> อันดับผู้ตรวจ</h2>
    <p className="mt-1 text-sm text-slate-600">จำนวนครั้งที่บันทึกผลในช่วง {period} ของรถที่เข้าร่วม แสดงเฉพาะผู้ที่มีผลตรวจ</p>
    {rows === null ? <form onSubmit={load} className="mt-3 flex flex-wrap items-end gap-3">
      <label className="text-sm">รหัสพนักงาน<input required name="employee" className="mt-1 block rounded-lg border border-slate-300 p-2" /></label>
      <label className="text-sm">คีย์สิทธิ์ Inspection<input required name="key" type="password" autoComplete="off" className="mt-1 block rounded-lg border border-slate-300 p-2" /></label>
      <button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2 font-bold text-white disabled:opacity-50">{busy && <Spinner />} {busy ? 'กำลังโหลด…' : 'เปิดอันดับผู้ตรวจ'}</button>
    </form> : <>
      <label className="mt-3 block text-sm">เรียงตามจำนวนครั้ง <select className="ml-2 rounded-lg border border-slate-300 p-2" value={sort} onChange={e=>setSort(e.target.value)}><option value="desc">มากที่สุดก่อน</option><option value="asc">น้อยที่สุดก่อน</option></select></label>
      {ranked.length ? <ol className="mt-3 divide-y divide-slate-100">{ranked.map((row,i)=><li key={i} className="flex justify-between gap-3 py-2"><span>{i+1}. {row.name}</span><strong>{row.count} ครั้ง</strong></li>)}</ol> : <p className="mt-3 text-sm">ไม่มีผลตรวจในช่วงนี้</p>}
    </>}
    {error && <p role="alert" className="mt-2 text-sm text-red-800">{error}</p>}
  </section>;
}
