'use client';
import { useEffect, useState } from 'react';
import type { InspectionKind } from '@/lib/inspection';
import { InspectionSkeleton } from './loading-ui';
import Icon from './inspection-icon';

type Entry = { name?: string; count: number };
export default function InspectionRanking({ period, kind, branch }: { period: string; kind: InspectionKind; branch: string }) {
  const [rows, setRows] = useState<Entry[] | null>(null);
  const [sort, setSort] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/inspection?' + new URLSearchParams({mode:'ranking',period,kind,branch}), {signal:controller.signal})
      .then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error || 'โหลดอันดับไม่สำเร็จ'); if (!controller.signal.aborted) setRows(data); })
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'โหลดอันดับไม่สำเร็จ'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [period, kind, branch, attempt]);
  const ranked = [...(rows ?? [])].sort((a,b) => (sort==='desc' ? b.count-a.count : a.count-b.count) || (a.name ?? '').localeCompare(b.name ?? '', 'th'));
  const max = Math.max(1, ...ranked.map(row => row.count));
  return <section className="rounded-2xl border border-slate-200 bg-white p-5">
    <h2 className="flex items-center gap-2 text-lg font-bold"><Icon name="chart" /> อันดับผู้ตรวจ</h2>
    <p className="mt-1 text-sm text-slate-600">จำนวนครั้งที่บันทึกผลในช่วง {period} · {branch || 'ทุกสาขา'} · เฉพาะผู้ที่มีผลตรวจ</p>
    {loading ? <InspectionSkeleton compact /> : rows === null ? <button type="button" className="mt-3 font-semibold text-indigo-700 underline" onClick={() => {setLoading(true);setError('');setAttempt(n=>n+1);}}>ลองโหลดใหม่</button> : <>
      <label className="mt-3 block text-sm">เรียงตามจำนวนครั้ง <select className="ml-2 rounded-lg border border-slate-300 p-2" value={sort} onChange={e=>setSort(e.target.value)}><option value="desc">มากที่สุดก่อน</option><option value="asc">น้อยที่สุดก่อน</option></select></label>
      {ranked.length ? <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-indigo-50 text-indigo-950"><tr><th scope="col" className="p-3">ลำดับ</th><th scope="col" className="p-3">{rows.some(row => row.name) ? 'ผู้ตรวจ' : 'สัดส่วนเทียบกับยอดสูงสุด'}</th><th scope="col" className="p-3 text-right">จำนวนครั้ง</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{ranked.map((row,i)=><tr key={i}><td className="p-3 tabular-nums">{i+1}</td><th scope="row" className="min-w-32 p-3 font-semibold">{row.name ?? <span className="sr-only">แถบจำนวนครั้ง</span>}<div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-indigo-100"><div className="h-full rounded-full bg-indigo-600" style={{width:(100*row.count/max)+'%'}} /></div></th><td className="whitespace-nowrap p-3 text-right font-bold tabular-nums">{row.count} ครั้ง</td></tr>)}</tbody>
        </table>
      </div> : <p className="mt-3 text-sm">ไม่มีผลตรวจในช่วงนี้</p>}
    </>}
    {error && <p role="alert" className="mt-2 text-sm text-red-800">{error}</p>}
  </section>;
}
