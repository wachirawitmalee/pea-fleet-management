'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { thaiInspectionDay, type InspectionDetail, type InspectionKind, type InspectionRow, type VehicleCategory } from '@/lib/inspection';

type Summary = { rows: InspectionRow[]; vehicles: { id: string; plate: string; category: VehicleCategory }[] };
type Detail = Omit<InspectionDetail, 'photoId'> & { hasPhoto: boolean; canApprove: boolean };
const field = 'block w-full rounded-xl border border-slate-300 bg-white p-3 text-base';
const status = { pending: 'รออนุมัติ', approved: 'อนุญาต', rejected: 'ไม่อนุญาต' };
const kindLabel = { vehicle: 'ตรวจสภาพรถ', 'pre-job': 'ตรวจก่อนเริ่มงาน' };
function AnswerValue({ value }: { value: unknown }) {
  if (Array.isArray(value)) return <ul className="ml-5 list-disc space-y-1">{value.map((v,i) => <li key={i}><AnswerValue value={v} /></li>)}</ul>;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const labels: Record<string,string> = { items:'รายการตรวจ', mileage:'เลขไมล์', tasks:'งาน', supervisor:'ผู้ควบคุมงาน', name:'ชื่อ', position:'ตำแหน่ง', department:'สังกัด', male:'ชาย', female:'หญิง', absent:'ขาด', total:'ผู้มาทำงาน', people:'ตรวจผู้ปฏิบัติงาน', tools:'ตรวจเครื่องมือ', toolAction:'การแก้ไขเครื่องมือ', carReady:'รถพร้อมใช้งาน', carReason:'สาเหตุ', carAction:'การแก้ไขรถ', vehicleChecks:'รายการตรวจรถก่อนเริ่มงาน', label:'รายการ', status:'ผล', note:'หมายเหตุ', pass:'จำนวนผ่าน', fail:'จำนวนไม่ผ่าน', checked:'ตรวจแล้ว' };
    return <dl className="space-y-1">{Object.entries(record).filter(([,v]) => v !== '' && v != null).map(([k,v]) => <div key={k} className="border-b border-slate-100 py-1"><dt className="text-xs font-bold text-slate-600">{labels[k] ?? k}</dt><dd><AnswerValue value={v} /></dd></div>)}</dl>;
  }
  return <span>{typeof value === 'boolean' ? (value ? 'ใช่' : 'ไม่ใช่') : value === 'pass' ? 'ผ่าน' : value === 'fail' ? 'ไม่ผ่าน' : String(value ?? '—')}</span>;
}
export default function Dashboard() {
  const [mode, setMode] = useState<'day'|'month'>('day');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [kind, setKind] = useState<InspectionKind>('vehicle');
  const [filter, setFilter] = useState('');
  const [category, setCategory] = useState('');
  const [result, setResult] = useState('');
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<InspectionRow | null>(null);
  const [employee, setEmployee] = useState('');
  const [key, setKey] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [photo, setPhoto] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
  const [detailError, setDetailError] = useState('');
  const [busy, setBusy] = useState(false);
  const period = mode === 'day' ? day || thaiInspectionDay() : month || thaiInspectionDay().slice(0,7);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/inspection?' + new URLSearchParams({ period }), { signal: controller.signal })
      .then(async r => { const body = await r.json(); if (!r.ok) throw new Error(body.error); setData(body); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message || 'โหลดผลตรวจไม่สำเร็จ'); });
    return () => controller.abort();
  }, [period, revision]);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo); }, [photo]);

  const summary = useMemo(() => {
    const eligible = (data?.vehicles ?? []).filter(v => (!category || category === v.category) && v.plate.toLowerCase().includes(filter.toLowerCase()));
    const ids = new Set(eligible.map(v => v.id));
    const all = (data?.rows ?? []).filter(r => r.kind === kind && ids.has(r.vehicleId)).sort((a,b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    const latest = new Map<string, InspectionRow>();
    const issues = new Map<string, number>();
    for (const row of all) {
      if (!latest.has(row.vehicleId)) latest.set(row.vehicleId, row);
      row.failures.forEach(f => issues.set(f, (issues.get(f) ?? 0) + 1));
    }
    return { eligible, all, latest, missing: eligible.filter(v => !latest.has(v.id)), issues: [...issues].sort((a,b) => b[1]-a[1]).slice(0,5), notReady: [...latest.values()].filter(r => !r.ready).length };
  }, [data, kind, filter, category]);
  const headers = { authorization: 'Bearer ' + key, 'x-inspection-employee': employee };
  async function openDetail(e: FormEvent) {
    e.preventDefault(); if (!selected) return;
    setBusy(true); setDetailError(''); setDetail(null); setPhoto('');
    try {
      const r = await fetch('/api/inspection?' + new URLSearchParams({ mode:'detail', id:selected.id }), { headers });
      const body = await r.json(); if (!r.ok) throw new Error(body.error);
      setDetail(body);
      if (body.hasPhoto) {
        const pic = await fetch('/api/inspection?' + new URLSearchParams({ mode:'photo', id:selected.id }), { headers });
        if (pic.ok) setPhoto(URL.createObjectURL(await pic.blob())); else setDetailError('โหลดรูปหลักฐานไม่สำเร็จ');
      }
    } catch (e) { setDetailError(e instanceof Error ? e.message : 'เปิดผลตรวจไม่สำเร็จ'); }
    finally { setBusy(false); }
  }
  async function decide(decision: 'approved'|'rejected') {
    if (!detail || busy) return;
    setBusy(true); setDetailError('');
    try {
      const r = await fetch('/api/inspection', { method:'POST', headers:{...headers,'Content-Type':'application/json'}, body:JSON.stringify({action:'decide',id:detail.id,decision,note:decisionNote}) });
      const body = await r.json(); if (!r.ok) throw new Error(body.error);
      setDetail({ ...detail, approval:decision, canApprove:false }); setData(null); setError(''); setRevision(v => v+1);
    } catch (e) { setDetailError(e instanceof Error ? e.message : 'บันทึกผลไม่สำเร็จ'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-6xl space-y-5 px-4 py-8 text-slate-900">
    <Link className="font-semibold text-violet-700" href="/inspection">← Inspection</Link>
    <header><h1 className="text-3xl font-extrabold">แดชบอร์ดผลตรวจ</h1><p className="mt-2 text-slate-600">สรุปตามวันตรวจในเวลาไทย · สาขาระโนด</p></header>
    <section className="grid grid-cols-2 gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-3 lg:grid-cols-6">
      <label>แบบตรวจ<select className={field} value={kind} onChange={e => setKind(e.target.value as InspectionKind)}><option value="vehicle">ตรวจสภาพรถ</option><option value="pre-job">ตรวจก่อนเริ่มงาน</option></select></label>
      <label>ช่วงเวลา<select className={field} value={mode} onChange={e => {setData(null);setError('');setMode(e.target.value as 'day'|'month');}}><option value="day">รายวัน</option><option value="month">รายเดือน</option></select></label>
      {mode === 'day' ? <label>วันที่<input className={field} type="date" value={day || period} onChange={e => {setData(null);setError('');setDay(e.target.value);}} /></label> : <label>เดือน<input className={field} type="month" value={month || period} onChange={e => {setData(null);setError('');setMonth(e.target.value);}} /></label>}
      <label>ทะเบียนรถ<input className={field} value={filter} onChange={e => setFilter(e.target.value)} placeholder="ค้นหาทะเบียน" /></label>
      <label>ประเภทรถ<select className={field} value={category} onChange={e => setCategory(e.target.value)}><option value="">ทั้งหมด</option>{['รถยนต์','เครน','โฟล์คลิฟท์'].map(x => <option key={x}>{x}</option>)}</select></label>
      <label>ผลตรวจ<select className={field} value={result} onChange={e => setResult(e.target.value)}><option value="">ทั้งหมด</option><option value="ready">พร้อม</option><option value="issues">พบปัญหา</option></select></label>
    </section>
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error} <button className="underline" onClick={() => {setError('');setRevision(v => v+1);}}>ลองใหม่</button></p> : !data ? <p role="status">กำลังโหลดผลตรวจ…</p> : <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[['ตรวจแล้ว (คัน)',summary.latest.size],['ยังไม่ตรวจ (คัน)',summary.missing.length],['จำนวนครั้งที่ตรวจ',summary.all.length],['ผลล่าสุดพบปัญหา (คัน)',summary.notReady]].map(([label,value]) => <div key={label} className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-700">{label}</p><p className="text-3xl font-bold text-violet-800">{value}</p></div>)}</div>
      {kind === 'pre-job' && <p className="rounded-xl bg-amber-50 p-4 font-semibold text-amber-900">รออนุมัติ {summary.all.filter(r => r.approval === 'pending').length} รายการ · อนุญาต {summary.all.filter(r => r.approval === 'approved').length} · ไม่อนุญาต {summary.all.filter(r => r.approval === 'rejected').length}</p>}
      <div className="grid gap-3 sm:grid-cols-2"><section className="rounded-2xl border bg-white p-4"><h2 className="font-bold">รถที่ยังไม่ตรวจในช่วงที่เลือก</h2><p className="mt-2 text-sm">{summary.missing.map(v => v.plate).join(' · ') || 'ไม่มี'}</p></section><section className="rounded-2xl border bg-white p-4"><h2 className="font-bold">ข้อบกพร่องที่พบบ่อย</h2>{summary.issues.length ? <ul>{summary.issues.map(([label,n]) => <li key={label}>{label} · {n} ครั้ง</li>)}</ul> : <p className="text-sm">ไม่มีข้อบกพร่องที่บันทึก</p>}</section></div>
      <section className="space-y-2"><h2 className="text-xl font-bold">ประวัติ{kindLabel[kind]}</h2>{summary.all.filter(r => !result || r.ready === (result === 'ready')).map(r => <article key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
        <div><p className="font-bold">{r.plate} · {r.category}</p><p className="text-sm">{new Date(r.date+'T00:00:00+07:00').toLocaleDateString('th-TH',{timeZone:'Asia/Bangkok'})} · <span className={r.ready ? 'text-emerald-800' : 'text-red-800'}>{r.ready ? 'พร้อม' : 'พบปัญหา'}</span>{r.approval ? ' · '+status[r.approval] : ''}</p>{r.failures.length > 0 && <p className="text-sm text-red-800">{r.failures.join(' · ')}</p>}</div>
        <button className="rounded-xl border px-4 py-2 font-semibold text-violet-800" onClick={() => {setSelected(r);setDetail(null);setPhoto('');setDetailError('');setDecisionNote('');}}>ดูรายละเอียด</button>
      </article>)}{!summary.all.some(r => !result || r.ready === (result === 'ready')) && <p className="rounded-xl border bg-white p-5 text-slate-600">ยังไม่มีผลตรวจตามตัวกรอง</p>}</section>
    </>}
    {selected && <section role="dialog" aria-modal="true" aria-label="รายละเอียดผลตรวจ" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-auto rounded-2xl bg-white p-5">
        <div className="flex justify-between gap-3"><h2 className="text-xl font-bold">{selected.plate} · รายละเอียด</h2><button className="text-violet-800 underline" disabled={busy} onClick={() => {setSelected(null);setPhoto('');setKey('');}}>ปิด</button></div>
        <p>{selected.date} · {selected.ready ? 'พร้อม' : 'พบปัญหา'}{selected.approval ? ' · '+status[detail?.approval ?? selected.approval] : ''}</p>
        {!selected.ready && <Link href={'/report-issue?' + new URLSearchParams({ vehicleId:selected.vehicleId, issue:selected.failures.join(', ') })} className="inline-block font-bold text-red-800 underline">นำข้อบกพร่องไปกรอกใบแจ้งซ่อม</Link>}
        {detail ? <><p className="font-semibold">ผู้ตรวจ: {detail.inspector.name}</p><AnswerValue value={detail.answers} />{detail.note && <p>หมายเหตุ: {detail.note}</p>}{photo && <img src={photo} alt="รูปหลักฐานการตรวจ" className="max-h-96 rounded-xl object-contain" />}
          {detail.canApprove && detail.approval === 'pending' && <div className="space-y-2 border-t pt-3"><label>ข้อคิดเห็น / เหตุผล<input className={field} value={decisionNote} onChange={e => setDecisionNote(e.target.value)} /></label><div className="flex flex-wrap gap-3"><button disabled={busy || !detail.ready} className="rounded-xl bg-emerald-800 px-4 py-2 text-white disabled:opacity-50" onClick={() => decide('approved')}>อนุญาต</button><button disabled={busy || !decisionNote.trim()} className="rounded-xl bg-red-800 px-4 py-2 text-white disabled:opacity-50" onClick={() => decide('rejected')}>ไม่อนุญาต</button></div></div>}
        </> : <form className="space-y-3" onSubmit={openDetail}><p className="text-sm">ผู้มีสิทธิ์เท่านั้นจึงจะดูชื่อผู้ตรวจ ข้อมูลรายข้อและรูปหลักฐานได้</p><label>รหัสพนักงาน<input className={field} required value={employee} onChange={e => setEmployee(e.target.value)} /></label><label>คีย์สิทธิ์ Inspection<input className={field} required type="password" value={key} onChange={e => setKey(e.target.value)} /></label><button disabled={busy} className="rounded-xl bg-violet-800 px-4 py-2 text-white disabled:opacity-50">{busy ? 'กำลังตรวจสอบ…' : 'เปิดผลตรวจฉบับเต็ม'}</button></form>}
        {detailError && <p role="alert" className="text-red-800">{detailError}</p>}
      </div>
    </section>}
  </main>;
}
