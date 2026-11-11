'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { inspectionSearch, thaiInspectionDay, type InspectionRow } from '@/lib/inspection';
import InspectionIcon, { type InspectionIconName } from '@/app/inspection/inspection-icon';

type Vehicle = { id: string; plate: string; branch: string };
type Summary = { rows: InspectionRow[]; vehicles: Vehicle[] };
type PeriodMode = 'day' | 'month' | 'year';
const field = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-950';
const button = 'inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-teal-50';
const dateFormat = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' });
const showDay = (day: string) => dateFormat.format(new Date(day + 'T00:00:00+07:00'));
const metrics: { label: string; icon: InspectionIconName; color: string }[] = [
  { label: 'สัดส่วนรถที่ตรวจแล้ว', icon: 'chart', color: 'border-indigo-200 bg-indigo-50 text-indigo-900' },
  { label: 'ตรวจแล้ว', icon: 'check', color: 'border-teal-200 bg-teal-50 text-teal-900' },
  { label: 'ยังไม่ตรวจ', icon: 'clock', color: 'border-amber-200 bg-amber-50 text-amber-950' },
  { label: 'รายการตรวจ', icon: 'list', color: 'border-sky-200 bg-sky-50 text-sky-900' },
];

export default function AdminInspectionPage() {
  const [date, setDate] = useState(thaiInspectionDay);
  const [mode, setMode] = useState<PeriodMode>('month');
  const [query, setQuery] = useState('');
  const [branch, setBranch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: Summary; error?: string }>();
  const period = date.slice(0, mode === 'day' ? 10 : mode === 'month' ? 7 : 4);
  const key = period + ':' + attempt;

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch('/api/inspection?' + new URLSearchParams({ period }), { signal: controller.signal });
        if (!response.ok) throw Error('โหลดประวัติการตรวจไม่สำเร็จ');
        const data: Summary = await response.json();
        if (!controller.signal.aborted) setResult({ key, data });
      } catch {
        if (!controller.signal.aborted) setResult({ key, error: 'โหลดประวัติการตรวจไม่สำเร็จ' });
      }
    }
    void load();
    return () => controller.abort();
  }, [key, period]);

  const current = result?.key === key ? result : undefined;
  const data = current?.data;
  const branches = Array.from(new Set(data?.vehicles.map(v => v.branch))).sort();
  const byVehicle = new Map<string, InspectionRow[]>();
  for (const row of data?.rows ?? []) {
    if (row.kind !== 'vehicle') continue;
    const records = byVehicle.get(row.vehicleId);
    if (records) records.push(row);
    else byVehicle.set(row.vehicleId, [row]);
  }
  const vehicles = (data?.vehicles ?? [])
    .filter(v => (!branch || v.branch === branch) && inspectionSearch(v.plate).includes(inspectionSearch(query)))
    .sort((a, b) => a.plate.localeCompare(b.plate, 'th'))
    .map(v => {
      const records = (byVehicle.get(v.id) ?? []).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
      return { ...v, records, days: Array.from(new Set(records.map(r => r.date))) };
    });
  const checked = vehicles.filter(v => v.days.length).length;
  const coverage = vehicles.length ? Math.round(checked / vehicles.length * 100) : null;
  const total = vehicles.reduce((sum, vehicle) => sum + vehicle.records.length, 0);
  const values = [coverage === null ? '—' : coverage + '%', checked + ' คัน', (vehicles.length - checked) + ' คัน', total + ' ครั้ง'];
  const year = date.slice(0, 4);
  const periodLabel = mode === 'day' ? showDay(date) : mode === 'year' ? 'พ.ศ. ' + (Number(year) + 543) :
    new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok' }).format(new Date(period + '-01T00:00:00+07:00'));

  return <div className="min-h-screen bg-slate-50 text-slate-950 print:min-h-0 print:bg-white">
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-7 print:max-w-none print:p-0">
      <style>{'@page { size: A4 landscape; margin: 12mm; }'}</style>
      <Link href="/admin" className={button + ' print:hidden'}><span className="mr-2" aria-hidden="true">←</span> กลับหน้าผู้ดูแลระบบ</Link>
      <header className="rounded-3xl border border-teal-100 bg-gradient-to-br from-white to-teal-50 p-6 print:border-0 print:bg-none print:p-0">
        <p className="text-xs font-bold tracking-widest text-teal-800">SMART FLEET CARE · INSPECTION</p>
        <h1 className="mt-2 flex items-center gap-3 text-3xl font-extrabold"><span className="rounded-xl bg-teal-100 p-2 text-teal-800 print:hidden"><InspectionIcon name="car" className="size-6" /></span>รายงานการตรวจสภาพรถ</h1>
        <p className="mt-2 text-slate-700 print:hidden">ค้นหาทะเบียน ดูวันที่ตรวจ และพิมพ์สรุปหรือใบตรวจรายครั้ง</p>
      </header>
      <section aria-label="ตัวกรองรายงาน" className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-sm font-bold sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        <label>ค้นหาทะเบียนรถ<input className={field} type="search" placeholder="พิมพ์ทะเบียนบางส่วน" value={query} onChange={e => setQuery(e.target.value)} /></label>
        <label>ช่วงรายงาน<select className={field} value={mode} onChange={e => setMode(e.target.value as PeriodMode)}><option value="day">รายวัน</option><option value="month">รายเดือน</option><option value="year">รายปี</option></select></label>
        <label>{mode === 'day' ? 'วันที่' : mode === 'month' ? 'เดือน' : 'ปี (ค.ศ.)'}
          {mode === 'year'
            ? <input className={field} type="number" min={1000} max={9999} key={year} defaultValue={year} onBlur={e => {
              const value = e.target.value;
              if (/^[1-9]\d{3}$/.test(value)) {
                if (value !== year) setDate(value + date.slice(4, 7) + '-01');
              } else e.target.value = year;
            }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
            : <input className={field} type={mode === 'day' ? 'date' : 'month'} value={period} onChange={e => { if (e.target.value) setDate(mode === 'month' ? e.target.value + '-01' : e.target.value); }} />}
        </label>
        <label>สาขา<select className={field} value={branch} onChange={e => setBranch(e.target.value)}><option value="">ทุกสาขา</option>{(branch && !branches.includes(branch) ? [branch, ...branches] : branches).map(b => <option key={b}>{b}</option>)}</select></label>
      </section>
      {!current ? <div role="status" className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-700">กำลังโหลดรายงาน…<div aria-hidden="true" className="mt-3 h-3 w-2/3 animate-pulse rounded-full bg-teal-100" /></div>
        : current.error ? <div role="alert" className="rounded-2xl bg-rose-50 p-5 text-rose-900">{current.error} <button className={button} onClick={() => setAttempt(i => i + 1)}>ลองอีกครั้ง</button></div>
        : <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-xl font-extrabold">สรุป {periodLabel}</h2><p className="text-sm text-slate-700">{branch || 'ทุกสาขา'}{query.trim() && ' · ทะเบียน: ' + query.trim()}</p></div>
            <div className="print:hidden">
              <button type="button" className={button} disabled={!vehicles.length} onClick={() => window.print()}>พิมพ์ / บันทึกสรุป PDF</button>
              <p className="mt-1 text-xs text-slate-600">ปิด «ส่วนหัวและส่วนท้าย» ในหน้าพิมพ์เพื่อซ่อน URL</p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-4">
            {metrics.map(({ label, icon, color }, index) => <div key={label} className={'rounded-2xl border p-4 ' + color}><dt className="flex items-center gap-2 text-sm font-semibold"><InspectionIcon name={icon} className="size-5 shrink-0" />{label}</dt><dd className="mt-2 text-2xl font-extrabold">{values[index]}</dd></div>)}
          </dl>
          <p className="text-sm text-slate-700">สัดส่วนคิดจากรถที่ตรวจอย่างน้อย 1 ครั้ง จากรถที่เข้าร่วม Inspection {vehicles.length} คันตามตัวกรองในช่วงที่เลือก</p>
          {coverage !== null && <div className="rounded-2xl border border-slate-200 bg-white p-4 print:hidden">
            <p className="mb-2 text-sm font-bold text-slate-800">ความคืบหน้าการตรวจ: {checked} / {vehicles.length} คัน</p>
            <div aria-hidden="true" className="flex h-3 overflow-hidden rounded-full bg-amber-200"><div className="bg-teal-600" style={{ width: (checked / vehicles.length * 100) + '%' }} /></div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs font-bold"><span className="text-teal-800">● ตรวจแล้ว</span><span className="text-amber-900">● ยังไม่ตรวจ</span></div>
          </div>}
          <div className="space-y-3 print:hidden">
            <h2 className="text-lg font-extrabold">วันที่ตรวจรายคัน</h2>
            {!vehicles.length && <p className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-700">ไม่พบรถที่ตรงกับตัวกรอง</p>}
            {vehicles.map(v => <article key={v.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><h3 className="font-extrabold">{v.plate}</h3><p className="text-sm text-slate-600">{v.branch} · {v.days.length ? 'ตรวจ ' + v.days.length + ' วัน · ' + v.records.length + ' ครั้ง' : 'ยังไม่ตรวจในช่วงที่เลือก'}</p></div>
                {v.records.length > 0 && <button type="button" className={button + ' print:hidden'} aria-expanded={expanded === v.id} aria-controls={'history-' + v.id} onClick={() => setExpanded(expanded === v.id ? null : v.id)}>{expanded === v.id ? 'ซ่อนใบตรวจ' : 'ดูใบตรวจ'}</button>}
              </div>
              {v.days.length > 0 && <ul aria-label="วันที่ตรวจ" className="mt-3 flex flex-wrap gap-2">{v.days.map(day => {
                const issue = v.records.some(row => row.date === day && (!row.ready || row.failures.length));
                return <li key={day} className={'flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold ' + (issue ? 'bg-rose-50 text-rose-900' : 'bg-teal-50 text-teal-900')}><InspectionIcon name={issue ? 'alert' : 'check'} className="size-4" />{showDay(day)}{issue && ' · พบความผิดปกติ'}</li>;
              })}</ul>}
              {v.records.length > 0 && <div id={'history-' + v.id} hidden={expanded !== v.id} className="mt-3 border-t border-slate-100 pt-2 print:hidden">
                <ul className="divide-y divide-slate-100">{v.records.map(row => <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span>{showDay(row.date)} · {row.ready ? 'พร้อมใช้งาน' : 'พบรายการผิดปกติ'}</span>
                  <Link className="font-bold text-teal-800 underline underline-offset-4" href={'/admin/inspection/print/' + encodeURIComponent(row.id)}>เปิดใบตรวจ / พิมพ์ PDF</Link>
                </li>)}</ul>
              </div>}
            </article>)}
          </div>
          <table className="hidden w-full border-collapse text-left text-sm print:table">
            <thead><tr>{['ทะเบียน / สาขา', 'วันที่ตรวจ', 'ผลตรวจ', 'รายการผิดปกติ'].map(label => <th key={label} className="border border-slate-400 bg-slate-100 p-2">{label}</th>)}</tr></thead>
            <tbody>{vehicles.flatMap(v => v.records.length ? v.records.map(row => {
              const abnormal = !row.ready || row.failures.length > 0;
              return <tr key={row.id} className="break-inside-avoid align-top">
                <td className="border p-2 font-bold">{v.plate}<div className="font-normal">{v.branch}</div></td>
                <td className="whitespace-nowrap border p-2">{showDay(row.date)}</td>
                <td className={'border p-2 font-bold ' + (abnormal ? 'text-rose-900' : 'text-teal-900')}>{abnormal ? 'พบความผิดปกติ' : 'ปกติ'}</td>
                <td className="border p-2">{row.failures.length ? <ul className="list-disc space-y-1 pl-4">{row.failures.map((item, index) => <li key={index}>{item}</li>)}</ul> : abnormal ? 'ไม่มีรายละเอียดในรายการตรวจ' : '—'}</td>
              </tr>;
            }) : [<tr key={v.id}><td className="border p-2 font-bold">{v.plate}<div className="font-normal">{v.branch}</div></td><td className="border p-2">—</td><td className="border p-2">ยังไม่ตรวจ</td><td className="border p-2">—</td></tr>])}</tbody>
          </table>
        </section>}
    </main>
  </div>;
}
