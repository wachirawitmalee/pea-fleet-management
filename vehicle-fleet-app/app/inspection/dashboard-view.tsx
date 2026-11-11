'use client';
import { branches, fleetBranch } from '@/lib/fleet-branches';

import Link from 'next/link';
import InspectionRanking from './ranking';
import { InspectionSkeleton, Spinner } from './loading-ui';
import Icon, { type InspectionIconName } from './inspection-icon';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { inspectionSearch, thaiInspectionDay, type InspectionDetail, type InspectionKind, type InspectionRow, type VehicleCategory } from '@/lib/inspection';

type Summary = { rows: InspectionRow[]; vehicles: { id: string; plate: string; branch?: string; category: VehicleCategory }[] };
type Detail = Omit<InspectionDetail, 'photoId' | 'inspector'> & { inspector: Pick<InspectionDetail['inspector'], 'name'>; hasPhoto: boolean; canApprove: boolean };
const field = 'block w-full rounded-xl border border-slate-300 bg-white p-3 text-base';
const status = { pending: 'รออนุมัติ', approved: 'อนุญาต', rejected: 'ไม่อนุญาต' };
const kindLabel = { vehicle: 'ตรวจสภาพรถ', 'pre-job': 'ตรวจก่อนเริ่มงาน' };
function VehicleDetail({ detail, photo, onPhotoError }: { detail: Detail; photo: string; onPhotoError: () => void }) {
  const answers = detail.answers as { mileage?: number; items?: { label: string; status: 'pass' | 'fail'; note?: string }[] } | null;
  const items = answers?.items ?? [];
  return <div className="space-y-4">
    <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
      <h3 className="flex items-center gap-2 font-bold text-indigo-900"><Icon name="person" /> ข้อมูลการตรวจ</h3>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
        <div><dt className="text-slate-600">ผู้ตรวจ</dt><dd className="font-bold">{detail.inspector.name}</dd></div>
        <div><dt className="text-slate-600">วันที่ตรวจ</dt><dd className="font-bold">{new Date(detail.date + 'T00:00:00+07:00').toLocaleDateString('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' })}</dd></div>
        <div><dt className="text-slate-600">เลขไมล์</dt><dd className="font-bold">{typeof answers?.mileage === 'number' ? answers.mileage.toLocaleString('th-TH') + ' กม.' : '—'}</dd></div>
      </dl>
    </section>
    {(detail.failures.length > 0 || detail.note) && <section className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-rose-950">
      <h3 className="flex items-center gap-2 font-bold"><Icon name="alert" /> ข้อที่ต้องติดตาม</h3>
      {detail.failures.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{detail.failures.map((item, index) => <li key={index}>{item}</li>)}</ul>}
      {detail.note && <p className="mt-2 whitespace-pre-wrap text-sm">หมายเหตุ: {detail.note}</p>}
    </section>}
    <section className="rounded-2xl border border-slate-200 p-4">
      <h3 className="flex items-center gap-2 font-bold text-indigo-900"><Icon name="list" /> เช็กลิสต์รายข้อ</h3>
      {items.length ? <ol className="mt-2 divide-y divide-slate-100">{items.map((item, index) => <li key={index} className="py-2.5">
        <div className="flex items-start justify-between gap-2 text-sm"><span className="font-semibold">{index + 1}. {item.label}</span><span className={'shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ' + (item.status === 'fail' ? 'bg-rose-100 text-rose-900' : 'bg-teal-100 text-teal-900')}>{item.status === 'fail' ? 'ผิดปกติ' : 'ปกติ'}</span></div>
        {item.note && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{item.note}</p>}
      </li>)}</ol> : <p className="mt-2 text-sm text-slate-600">รายการนี้ไม่มีผลตรวจรายข้อ</p>}
    </section>
    <section className="rounded-2xl border border-slate-200 p-4">
      <h3 className="flex items-center gap-2 font-bold text-indigo-900"><Icon name="check" /> รูปหลักฐาน</h3>
      {photo ? <img src={photo} alt="รูปหลักฐานการตรวจสภาพรถ" className="mt-3 max-h-96 w-full rounded-xl bg-slate-50 object-contain" onError={onPhotoError} /> : <p className="mt-2 text-sm text-slate-600">ไม่มีรูปแนบ</p>}
    </section>
  </div>;
}
function AnswerValue({ value }: { value: unknown }) {
  if (Array.isArray(value)) return <ul className="ml-5 list-disc space-y-1">{value.map((v,i) => <li key={i}><AnswerValue value={v} /></li>)}</ul>;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const labels: Record<string,string> = { items:'รายการตรวจ', mileage:'เลขไมล์', tasks:'งาน', supervisor:'ผู้ควบคุมงาน', name:'ชื่อ', position:'ตำแหน่ง', department:'สังกัด', male:'ชาย', female:'หญิง', absent:'ขาด', total:'ผู้มาทำงาน', people:'ตรวจผู้ปฏิบัติงาน', tools:'ตรวจเครื่องมือ', toolAction:'การแก้ไขเครื่องมือ', carReady:'รถพร้อมใช้งาน', carReason:'สาเหตุ', carAction:'การแก้ไขรถ', vehicleChecks:'รายการตรวจรถก่อนเริ่มงาน', label:'รายการ', status:'ผล', note:'หมายเหตุ', pass:'จำนวนผ่าน', fail:'จำนวนไม่ผ่าน', checked:'ตรวจแล้ว' };
    return <dl className="space-y-1">{Object.entries(record).filter(([,v]) => v !== '' && v != null).map(([k,v]) => <div key={k} className="border-b border-slate-100 py-1"><dt className="text-xs font-bold text-slate-600">{labels[k] ?? k}</dt><dd><AnswerValue value={v} /></dd></div>)}</dl>;
  }
  return <span>{typeof value === 'boolean' ? (value ? 'ใช่' : 'ไม่ใช่') : value === 'pass' ? 'ผ่าน' : value === 'fail' ? 'ไม่ผ่าน' : String(value ?? '—')}</span>;
}
export default function Dashboard({ embedded = false, adminView = false }: { embedded?: boolean; adminView?: boolean }) {
  const [view, setView] = useState<'today'|'report'>(embedded ? 'today' : 'report');
  const [mode, setMode] = useState<'day'|'month'|'year'>('day');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [todayRows, setTodayRows] = useState<InspectionRow[]>([]);
  const [kind, setKind] = useState<InspectionKind>('vehicle');
  const [filter, setFilter] = useState('');
  const [branch, setBranch] = useState('');
  const [category, setCategory] = useState('');
  const [fleetStatus, setFleetStatus] = useState('');
  const [result, setResult] = useState('');
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [historyVehicle, setHistoryVehicle] = useState<string | null>(null);
  const [selected, setSelected] = useState<InspectionRow | null>(null);
  const [employee, setEmployee] = useState('');
  const [key, setKey] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [photo, setPhoto] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
  const [detailError, setDetailError] = useState('');
  const [busy, setBusy] = useState(false);
  const today = thaiInspectionDay();
  const period = mode === 'day' ? day || today : mode === 'month' ? month || today.slice(0,7) : year || today.slice(0,4);
  useEffect(() => {
    const controller = new AbortController();
    const read = async (p: string): Promise<Summary> => {
      const r = await fetch('/api/inspection?' + new URLSearchParams({ period: p }), { signal: controller.signal, cache: 'no-store' });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error);
      return body;
    };
    const selectedPeriod = read(period);
    Promise.all([selectedPeriod, today.startsWith(period) ? selectedPeriod : read(today)])
      .then(([selected, current]) => { if (!controller.signal.aborted) { setData(selected); setTodayRows(current.rows.filter(r => r.date === today)); } })
      .catch(e => { if (!controller.signal.aborted) setError(e.message || 'โหลดผลตรวจไม่สำเร็จ'); });
    return () => controller.abort();
  }, [period, today, revision]);
  useEffect(() => { if (historyVehicle) document.getElementById('inspection-vehicle-history')?.focus(); }, [historyVehicle]);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo); }, [photo]);

  const summary = useMemo(() => {
    const eligible = (data?.vehicles ?? []).filter(v => (!branch || fleetBranch(v.branch)===branch) && (!category || category === v.category) && inspectionSearch(v.plate).includes(inspectionSearch(filter)));
    const ids = new Set(eligible.map(v => v.id));
    const all = (data?.rows ?? []).filter(r => r.kind === kind && ids.has(r.vehicleId)).sort((a,b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    const latest = new Map<string, InspectionRow>();
    const issues = new Map<string, number>();
    const counts = new Map<string, number>();
    for (const row of all) {
      counts.set(row.vehicleId, (counts.get(row.vehicleId) ?? 0) + 1);
      if (!latest.has(row.vehicleId)) latest.set(row.vehicleId, row);
      row.failures.forEach(f => issues.set(f, (issues.get(f) ?? 0) + 1));
    }
    return { eligible, all, latest, counts, missing: eligible.filter(v => !latest.has(v.id)), issues: [...issues].sort((a,b) => b[1]-a[1]).slice(0,5), notReady: [...latest.values()].filter(r => !r.ready).length };
  }, [data, kind, filter, category, branch]);
  const todayLatest = new Map<string, InspectionRow>();
  for (const row of todayRows) {
    if (row.kind !== 'vehicle') continue;
    const previous = todayLatest.get(row.vehicleId);
    if (!previous || previous.createdAt < row.createdAt) todayLatest.set(row.vehicleId, row);
  }
  const todayFleet = (data?.vehicles ?? []).filter(v=>!branch || fleetBranch(v.branch)===branch);
  const missingToday = todayFleet.filter(v => !todayLatest.has(v.id));
  const issuesToday = todayFleet.filter(v => todayLatest.get(v.id)?.ready === false);
  const normalToday = todayFleet.length - missingToday.length - issuesToday.length;
  const pct = (count: number) => todayFleet.length ? 100*count/todayFleet.length : 0;

  const chart = useMemo(() => {
    const buckets = new Map<string, { passed: number; issues: number }>();
    if (mode === 'year') for (let i=1;i<=12;i++) buckets.set(String(i).padStart(2,'0'), { passed:0, issues:0 });
    if (mode === 'month') {
      const [y,m] = period.split('-').map(Number);
      for (let i=1;i<=new Date(Date.UTC(y,m,0)).getUTCDate();i++) buckets.set(String(i).padStart(2,'0'), { passed:0, issues:0 });
    }
    if (mode === 'day') buckets.set(period.slice(-2), { passed:0, issues:0 });
    summary.all.forEach(r => { const bucket = buckets.get(mode === 'year' ? r.date.slice(5,7) : r.date.slice(8,10)); if (bucket) bucket[r.ready ? 'passed' : 'issues']++; });
    return [...buckets];
  }, [mode, period, summary.all]);
  const chartMax = Math.max(1, ...chart.map(([,v]) => v.passed + v.issues));
  const coverage = summary.eligible.length ? Math.round(100 * summary.latest.size / summary.eligible.length) : null;
  const cards: { label: string; value: string | number; note: string; icon: InspectionIconName; color: string }[] = [
    { label:'รถที่ตรวจแล้ว', value:summary.latest.size, note:'นับแต่ละทะเบียนเพียงครั้งเดียว', icon:'check', color:'bg-teal-50 text-teal-800' },
    { label:'ยังไม่ตรวจในช่วงที่เลือก', value:summary.missing.length, note:'จากรถตามตัวกรอง ' + summary.eligible.length + ' คัน', icon:'clock', color:'bg-amber-50 text-amber-900' },
    { label:'ผลล่าสุดพบปัญหา', value:summary.notReady, note:'นับเฉพาะผลล่าสุดของแต่ละคัน', icon:'alert', color:'bg-rose-50 text-rose-800' },
    { label:'จำนวนครั้งที่ตรวจ', value:summary.all.length, note:'รวมการตรวจซ้ำของรถคันเดิม', icon:'chart', color:'bg-violet-50 text-violet-800' },
  ];
  const fleet = summary.eligible.map(v => ({ ...v, latest: summary.latest.get(v.id), count: summary.counts.get(v.id) ?? 0 }))
    .sort((a,b) => (a.latest ? a.latest.ready ? 2 : 0 : 1) - (b.latest ? b.latest.ready ? 2 : 0 : 1) || a.plate.localeCompare(b.plate, 'th'))
    .filter(v => !fleetStatus || (fleetStatus === 'missing' ? !v.latest : fleetStatus === 'issues' ? v.latest && !v.latest.ready : v.latest?.ready));
  const showDetail = (row: InspectionRow) => {
    setSelected(row); setDetail(null); setPhoto(''); setDetailError(''); setDecisionNote('');
    if (row.kind === 'vehicle') void loadDetail(row);
  };
  const headers = { authorization: 'Bearer ' + key, 'x-inspection-employee': employee };
  async function openDetail(e?: FormEvent) {
    e?.preventDefault(); if (selected) await loadDetail(selected);
  }
  async function loadDetail(row: InspectionRow) {
    setBusy(true); setDetailError(''); setDetail(null); setPhoto('');
    try {
      const publicVehicle = row.kind === 'vehicle';
      const r = await fetch('/api/inspection?' + new URLSearchParams({ mode:'detail', id:row.id }), { headers: publicVehicle ? undefined : headers });
      const body = await r.json(); if (!r.ok) throw new Error(body.error);
      setDetail(body);
      if (body.hasPhoto) {
        const url = '/api/inspection?' + new URLSearchParams({ mode:'photo', id:row.id });
        if (publicVehicle) setPhoto(url);
        else {
          const pic = await fetch(url, { headers });
          if (pic.ok) setPhoto(URL.createObjectURL(await pic.blob())); else setDetailError('โหลดรูปหลักฐานไม่สำเร็จ');
        }
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
  return <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 text-slate-900 sm:px-6">
    {!embedded && <Link className="font-semibold text-violet-700" href={adminView ? "/admin" : "/inspection"}>← {adminView ? "ผู้ดูแลระบบ" : "Inspection"}</Link>}
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <p className="mb-2 px-1 text-xs font-bold text-slate-600">มุมมองแดชบอร์ด</p>
      <nav aria-label="มุมมองแดชบอร์ด" className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1.5">
        {([['today','ศูนย์ติดตามวันนี้','ดูรถที่ต้องติดตาม','clock'],['report','รายงานแนวโน้ม','ดูกราฟและประวัติย้อนหลัง','chart']] as const).map(([id,label,description,icon]) => {
          const active = view === id;
          return <button key={id} type="button" aria-pressed={active} onClick={() => setView(id)} className={`flex min-w-0 flex-col items-start gap-2 rounded-xl border px-2.5 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 sm:flex-row sm:items-center sm:gap-3 sm:px-4 ${active ? 'border-indigo-200 bg-white text-indigo-950 shadow-sm' : 'border-transparent text-slate-700 hover:bg-white/70'}`}>
            <span className={`shrink-0 rounded-lg p-2 ${active ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-600'}`}><Icon name={icon} className="size-4 sm:size-5" /></span>
            <span className="min-w-0"><span className="block text-sm font-extrabold">{label}</span><span className="mt-0.5 block text-xs text-slate-600">{description}</span></span>
            {active && <span aria-hidden="true" className="ml-auto hidden rounded-full bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700 md:block">กำลังดู</span>}
          </button>;
        })}
      </nav>
    </section>
    <label className="block max-w-xs text-sm font-bold">กฟฟ. / สาขา<select className={field} value={branch} onChange={e=>setBranch(e.target.value)}><option value="">ทุกสาขา</option>{branches.map(b=><option key={b}>{b}</option>)}</select></label>
    {view === 'today' ? (error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error} <button className="underline" onClick={() => {setError('');setRevision(v=>v+1);}}>ลองใหม่</button></p> : !data ? <InspectionSkeleton /> : <>
      <section className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/70 to-teal-50 p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold tracking-widest text-indigo-700">สรุปการตรวจสภาพรถ · {today}</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-3xl font-extrabold sm:text-4xl">ความพร้อมของรถวันนี้</h2><p className="mt-2 text-slate-600">ตรวจแล้ว <strong>{normalToday+issuesToday.length}</strong> จาก <strong>{todayFleet.length}</strong> คัน</p></div><span className="rounded-2xl bg-white px-4 py-2 text-3xl font-extrabold text-indigo-800">{todayFleet.length ? Math.round(pct(normalToday+issuesToday.length))+'%' : '—'}</span></div>
        <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label="สัดส่วนรถที่ตรวจวันนี้" aria-valuenow={Math.round(pct(normalToday+issuesToday.length))} aria-valuemin={0} aria-valuemax={100}>
          <span className="bg-gradient-to-r from-teal-600 to-emerald-400 transition-[width] duration-500 motion-reduce:transition-none" style={{width:pct(normalToday)+'%'}}/><span className="bg-rose-500 transition-[width] duration-500 motion-reduce:transition-none" style={{width:pct(issuesToday.length)+'%'}}/>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-4">
          {([['พร้อม',normalToday,'check','text-teal-800'],['พบปัญหา',issuesToday.length,'alert','text-rose-800'],['ยังไม่ตรวจ',missingToday.length,'clock','text-amber-900']] as const).map(([label,count,icon,color]) => <div key={label} className={`rounded-2xl border border-white bg-white/85 p-3 sm:p-4 ${color}`}><Icon name={icon}/><p className="mt-2 text-2xl font-extrabold tabular-nums">{count}</p><p className="text-xs font-bold sm:text-sm">{label}</p></div>)}
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 font-bold text-rose-800"><Icon name="alert" /> รถที่พบปัญหาวันนี้</h2>
          {issuesToday.length ? <ul className="mt-3 divide-y divide-rose-100">{issuesToday.map(v => { const row=todayLatest.get(v.id)!; return <li key={v.id} className="flex items-center justify-between gap-3 py-3"><div><p className="font-bold">{v.plate}</p><p className="text-sm text-slate-600">{row.failures.join(' · ')}</p></div><button className="shrink-0 text-sm font-bold text-indigo-700 underline" onClick={()=>showDetail(row)}>ดูผล</button></li>; })}</ul> : <p className="mt-3 text-sm text-slate-600">{normalToday ? 'ยังไม่พบปัญหาจากผลที่บันทึกวันนี้' : 'ยังไม่มีผลตรวจสภาพรถวันนี้'}</p>}
        </section>
        <section className="rounded-3xl border border-amber-100 bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 font-bold text-amber-900"><Icon name="clock" /> รถที่ยังไม่ได้ตรวจสภาพวันนี้</h2>
          {missingToday.length ? <ul className="mt-3 grid max-h-52 grid-cols-2 gap-2 overflow-auto">{missingToday.map(v=><li key={v.id} className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950">{v.plate}</li>)}</ul> : <p className="mt-3 text-sm text-slate-600">{todayFleet.length ? 'ตรวจครบทุกคันแล้ววันนี้' : 'ยังไม่มีรถเข้าร่วม Inspection ให้เปิดใช้งานในหน้าจัดการรถ'}</p>}
        </section>
      </div>
      <button type="button" onClick={() => setView('report')} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 font-bold text-indigo-800"><Icon name="chart"/> ดูรายงานย้อนหลังและสถานะรายคัน →</button>
    </>) : <>
    <header className="flex items-start gap-3"><span className="rounded-xl bg-indigo-100 p-3 text-indigo-800"><Icon name="chart" /></span><div><h2 className="text-2xl font-extrabold">รายงานแนวโน้ม</h2><p className="mt-1 text-sm text-slate-600">เปรียบเทียบช่วงเวลาและดูประวัติแยกตามทะเบียน</p></div></header>
    <section className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3 lg:grid-cols-6">
      <h3 className="col-span-full flex items-center gap-2 font-bold"><Icon name="filter" /> เลือกข้อมูลที่ต้องการดู</h3>
      <label>แบบตรวจ<select className={field} value={kind} onChange={e => setKind(e.target.value as InspectionKind)}><option value="vehicle">ตรวจสภาพรถ</option><option value="pre-job">ตรวจก่อนเริ่มงาน</option></select></label>
      <label>ช่วงเวลา<select className={field} value={mode} onChange={e => {setData(null);setError('');setMode(e.target.value as 'day'|'month'|'year');}}><option value="day">รายวัน</option><option value="month">รายเดือน</option><option value="year">รายปี</option></select></label>
      {mode === 'day' ? <label>วันที่<input className={field} type="date" value={day || period} onChange={e => {if ((e.target.value || today) !== period) {setData(null);setError('');setDay(e.target.value);}}} /></label> : mode === 'month' ? <label>เดือน<input className={field} type="month" value={month || period} onChange={e => {if ((e.target.value || today.slice(0,7)) !== period) {setData(null);setError('');setMonth(e.target.value);}}} /></label> : <label>ปี (พ.ศ.)<select className={field} value={year || period} onChange={e => {setData(null);setError('');setYear(e.target.value);}}>{Array.from({length: 10}, (_,i) => Number(today.slice(0,4)) - i).map(y => <option key={y} value={y}>{y+543}</option>)}</select></label>}
      <label>ทะเบียนรถ<input className={field} value={filter} onChange={e => setFilter(e.target.value)} placeholder="ค้นหาทะเบียน" /></label>
      <label>ประเภทรถ<select className={field} value={category} onChange={e => setCategory(e.target.value)}><option value="">ทั้งหมด</option>{['รถยนต์','เครน','โฟล์คลิฟท์'].map(x => <option key={x}>{x}</option>)}</select></label>
      <label>ผลในประวัติ<select className={field} value={result} onChange={e => setResult(e.target.value)}><option value="">ทั้งหมด</option><option value="ready">พร้อม</option><option value="issues">พบปัญหา</option></select></label>
    </section>
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error} <button className="underline" onClick={() => {setError('');setRevision(v => v+1);}}>ลองใหม่</button></p> : !data ? <InspectionSkeleton /> : <>
      <section className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-sm font-bold text-violet-800">{kindLabel[kind]} · {period}</p><h3 className="mt-1 text-xl font-bold">ตรวจแล้ว {summary.latest.size} จาก {summary.eligible.length} คัน</h3><p className="mt-1 text-sm text-slate-600">สัดส่วนรถที่ตรวจอย่างน้อยหนึ่งครั้งในช่วงที่เลือก</p></div>
          <span className="rounded-2xl bg-white px-4 py-2 text-3xl font-extrabold text-violet-800">{coverage === null ? '—' : coverage + '%'}</span>
        </div>
        {coverage !== null && <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-violet-100" role="progressbar" aria-label="ความครอบคลุมการตรวจ" aria-valuenow={coverage} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-violet-600" style={{width: coverage+'%'}} /></div>}
      </section>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{cards.map(({label,value,note,icon,color}) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className={`inline-flex rounded-xl p-2 ${color}`}><Icon name={icon} /></span><p className="mt-3 text-sm font-bold text-slate-700">{label}</p><p className="mt-1 text-3xl font-extrabold tabular-nums">{value}</p><p className="mt-1 text-xs text-slate-600">{note}</p></div>)}</div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold"><Icon name="chart" /> แนวโน้มการตรวจ</h2>
        <p className="mt-1 text-sm text-slate-600">จำนวนครั้งที่ตรวจ · สีเขียว: พร้อม · สีส้ม: พบปัญหา</p>
        <div className="mt-5 overflow-x-auto"><div className="flex min-w-max items-end gap-2" role="list" aria-label="กราฟผลตรวจ">
          {chart.map(([label,v]) => <div key={label} role="listitem" className="w-8 shrink-0 text-center" title={label + ': พร้อม ' + v.passed + ' พบปัญหา ' + v.issues}>
            <span className="text-xs font-semibold">{v.passed + v.issues}</span>
            <div className="flex h-28 flex-col justify-end overflow-hidden rounded-t-md bg-slate-100" aria-label={'พร้อม ' + v.passed + ' พบปัญหา ' + v.issues}>
              <div className="bg-amber-500" style={{height: (100*v.issues/chartMax)+'%'}}/><div className="bg-teal-500" style={{height: (100*v.passed/chartMax)+'%'}}/>
            </div><p className="mt-1 text-xs text-slate-600">{mode === 'year' ? ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'][Number(label)-1] : label}</p>
          </div>)}
        </div></div>
        {summary.all.length === 0 && <p className="mt-3 text-sm text-slate-600">ยังไม่มีผลตรวจในช่วงเวลานี้</p>}
      </section>
      {kind === 'pre-job' && <p className="rounded-xl bg-amber-50 p-4 font-semibold text-amber-900">รออนุมัติ {summary.all.filter(r => r.approval === 'pending').length} รายการ · อนุญาต {summary.all.filter(r => r.approval === 'approved').length} · ไม่อนุญาต {summary.all.filter(r => r.approval === 'rejected').length}</p>}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-bold"><Icon name="car" /> สถานะรายคัน</h2><p className="mt-1 text-sm text-slate-600">เรียงคันที่พบปัญหาขึ้นก่อน ตามด้วยคันที่ยังไม่ได้ตรวจ · เลือก “ดูวันที่ตรวจ” เพื่อเปิดประวัติรายคัน</p></div><label className="text-sm font-semibold">แสดงสถานะ<select className={field} value={fleetStatus} onChange={e => setFleetStatus(e.target.value)}><option value="">ทั้งหมด</option><option value="issues">พบปัญหา</option><option value="missing">ยังไม่ตรวจ</option><option value="ready">พร้อม</option></select></label></div>
        <div className="mt-4 max-h-96 overflow-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[38rem] text-left text-sm"><thead className="sticky top-0 bg-slate-100"><tr>{['ทะเบียน / ประเภท','ผลล่าสุด','วันที่ตรวจ','ตรวจ (ครั้ง)','รายละเอียด'].map(h => <th scope="col" key={h} className="px-3 py-2">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">
            {fleet.map(v => <tr key={v.id} className="hover:bg-violet-50/50"><th scope="row" className="px-3 py-2">{v.plate}<span className="block text-xs font-normal text-slate-600">{v.category}</span></th><td className="px-3 py-2"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${!v.latest ? 'bg-amber-100 text-amber-900' : v.latest.ready ? 'bg-teal-100 text-teal-900' : 'bg-rose-100 text-rose-900'}`}>{!v.latest ? 'ยังไม่ตรวจ' : v.latest.ready ? 'พร้อม' : 'พบปัญหา'}</span></td><td className="px-3 py-2">{v.latest?.date ?? '—'}</td><td className="px-3 py-2 tabular-nums">{v.count}</td><td className="px-3 py-2">{v.latest ? <button type="button" className="font-bold text-violet-800 underline" onClick={() => setHistoryVehicle(v.id)}>ดูวันที่ตรวจ</button> : '—'}</td></tr>)}
            {fleet.length === 0 && <tr><td colSpan={5} className="p-4 text-slate-600">ไม่พบรถตามตัวกรองนี้</td></tr>}
          </tbody></table>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="flex items-center gap-2 text-lg font-bold"><Icon name="alert" /> ข้อบกพร่องที่พบบ่อย</h2>{summary.issues.length ? <ul>{summary.issues.map(([label,n]) => <li key={label} className="mt-3 text-sm"><div className="flex justify-between gap-2"><span>{label}</span><span className="font-bold">{n} ครั้ง</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-rose-400" style={{width:(100*n/summary.issues[0][1])+'%'}} /></div></li>)}</ul> : <p className="mt-2 text-sm text-slate-600">{summary.all.length ? 'ไม่พบข้อบกพร่องในช่วงที่เลือก' : 'ยังไม่มีผลตรวจสำหรับสรุปข้อบกพร่อง'}</p>}</section>
      <InspectionRanking key={period+kind+branch} period={period} kind={kind} branch={branch} />
      {historyVehicle && <section id="inspection-vehicle-history" tabIndex={-1} className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5" aria-label="วันที่ตรวจรายคัน">
        <div className="flex items-center justify-between gap-3"><h2 className="font-bold">วันที่ตรวจ · {summary.eligible.find(v => v.id === historyVehicle)?.plate ?? 'รถที่เลือก'}</h2><button className="text-sm font-bold text-indigo-800 underline" onClick={() => setHistoryVehicle(null)}>ปิด</button></div>
        <p className="mt-1 text-sm text-slate-600">เลือกวันที่หรือครั้งที่ตรวจเพื่อเปิดรายละเอียด</p>
        <ul className="mt-3 max-h-64 space-y-2 overflow-auto">{summary.all.filter(r => r.vehicleId === historyVehicle).map(r => <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-4 py-3"><span className="font-semibold">{r.date} · {new Date(r.createdAt).toLocaleTimeString('th-TH',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit'})} น. · {r.ready ? 'พร้อม' : 'พบปัญหา'}</span><button className="text-sm font-bold text-indigo-800 underline" onClick={() => showDetail(r)}>ดูรายละเอียด</button>{adminView && r.kind==='vehicle' && <Link href={'/admin/inspection/print/'+encodeURIComponent(r.id)} className="rounded-lg bg-indigo-100 px-3 py-2 text-sm font-bold text-indigo-900">พิมพ์ใบตรวจ</Link>}</li>)}</ul>
      </section>}
      <section className="space-y-2"><h2 className="flex items-center gap-2 text-xl font-bold"><Icon name="list" /> ประวัติ{kindLabel[kind]}</h2>{summary.all.filter(r => !result || r.ready === (result === 'ready')).map(r => <article key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div><p className="font-bold">{r.plate} · {r.category}</p><p className="text-sm">{new Date(r.date+'T00:00:00+07:00').toLocaleDateString('th-TH',{timeZone:'Asia/Bangkok'})} · <span className={r.ready ? 'text-emerald-800' : 'text-red-800'}>{r.ready ? 'พร้อม' : 'พบปัญหา'}</span>{r.approval ? ' · '+status[r.approval] : ''}</p>{r.failures.length > 0 && <p className="text-sm text-red-800">{r.failures.join(' · ')}</p>}</div>
        <button className="rounded-xl border border-violet-200 px-4 py-2 font-semibold text-violet-800" onClick={() => showDetail(r)}>ดูรายละเอียด</button>
      </article>)}{!summary.all.some(r => !result || r.ready === (result === 'ready')) && <p className="rounded-xl border border-slate-200 bg-white p-5 text-slate-600">ยังไม่มีผลตรวจตามตัวกรอง</p>}</section>
    </>}
    </>}
    {selected && <section role="dialog" aria-modal="true" aria-label="รายละเอียดผลตรวจ" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-auto rounded-2xl bg-white p-5">
        <div className="flex justify-between gap-3"><h2 className="text-xl font-bold">{selected.plate} · รายละเอียด</h2><button className="text-violet-800 underline" disabled={busy} onClick={() => {setSelected(null);setPhoto('');setKey('');}}>ปิด</button></div>
        <p>{selected.date} · {selected.ready ? 'พร้อม' : 'พบปัญหา'}{selected.approval ? ' · '+status[detail?.approval ?? selected.approval] : ''}</p>
        {adminView && selected.kind === 'vehicle' && <Link href={'/admin/inspection/print/'+encodeURIComponent(selected.id)} className="inline-block rounded-xl bg-indigo-100 px-4 py-2 font-bold text-indigo-900">เปิดใบตรวจเพื่อพิมพ์</Link>}
        {!selected.ready && <Link href={'/report-issue?' + new URLSearchParams({ vehicleId:selected.vehicleId, issue:selected.failures.join(', ') })} className="inline-block font-bold text-red-800 underline">นำข้อบกพร่องไปกรอกใบแจ้งซ่อม</Link>}
        {detail ? <>{detail.kind === 'vehicle' ? <VehicleDetail detail={detail} photo={photo} onPhotoError={() => setDetailError('โหลดรูปหลักฐานไม่สำเร็จ')} /> : <><p className="font-semibold">ผู้ตรวจ: {detail.inspector.name}</p><AnswerValue value={detail.answers} />{detail.note && <p>หมายเหตุ: {detail.note}</p>}{photo && <img src={photo} alt="รูปหลักฐานการตรวจ" className="max-h-96 rounded-xl object-contain" onError={() => setDetailError('โหลดรูปหลักฐานไม่สำเร็จ')} />}</>}
          {detail.canApprove && detail.approval === 'pending' && <div className="space-y-2 border-t pt-3"><label>ข้อคิดเห็น / เหตุผล<input className={field} value={decisionNote} onChange={e => setDecisionNote(e.target.value)} /></label><div className="flex flex-wrap gap-3"><button disabled={busy || !detail.ready} className="rounded-xl bg-emerald-800 px-4 py-2 text-white disabled:opacity-50" onClick={() => decide('approved')}>อนุญาต</button><button disabled={busy || !decisionNote.trim()} className="rounded-xl bg-red-800 px-4 py-2 text-white disabled:opacity-50" onClick={() => decide('rejected')}>ไม่อนุญาต</button></div></div>}
        </> : selected.kind === 'vehicle' ? (busy ? <p role="status" className="flex items-center gap-2"><Spinner /> กำลังโหลดผลตรวจ…</p> : <button type="button" onClick={() => void loadDetail(selected)} className="font-bold text-violet-800 underline">โหลดผลตรวจอีกครั้ง</button>) : adminView ? <button type="button" disabled={busy} onClick={()=>openDetail()} className="rounded-xl bg-indigo-700 px-4 py-2 font-bold text-white">{busy ? 'กำลังโหลด…' : 'เปิดผลตรวจฉบับเต็ม'}</button> : <form className="space-y-3" onSubmit={openDetail}><p className="text-sm">ผู้มีสิทธิ์เท่านั้นจึงจะดูชื่อผู้ตรวจ ข้อมูลรายข้อและรูปหลักฐานได้</p><label>รหัสพนักงาน<input className={field} required value={employee} onChange={e => setEmployee(e.target.value)} /></label><label>คีย์สิทธิ์ Inspection<input className={field} required type="password" value={key} onChange={e => setKey(e.target.value)} /></label><button disabled={busy} className="rounded-xl bg-violet-800 px-4 py-2 text-white disabled:opacity-50">{busy ? <span className="inline-flex items-center gap-2"><Spinner /> กำลังตรวจสอบ…</span> : 'เปิดผลตรวจฉบับเต็ม'}</button></form>}
        {detailError && <p role="alert" className="text-red-800">{detailError}</p>}
      </div>
    </section>}
  </main>;
}
