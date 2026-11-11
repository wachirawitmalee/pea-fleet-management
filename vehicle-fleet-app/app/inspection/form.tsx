'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { jobVehicleChecks, thaiInspectionDay, toolChecks, vehicleChecks, workerChecks, type InspectionKind, type VehicleCategory } from '@/lib/inspection';
import { preparePhoto } from '@/lib/prepare-photo';

type Option = { id: string; label: string; category?: VehicleCategory };
type Answer = { status?: 'pass' | 'fail'; note?: string; pass?: number; fail?: number };
const inputClass = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base';
const boxClass = 'space-y-4 rounded-2xl border border-slate-200 bg-white p-5';
const primary = 'rounded-xl bg-violet-700 px-5 py-3 font-bold text-white disabled:opacity-50';

function Lookup({ label, entity, value, onChange }: { label: string; entity: 'vehicle' | 'employee'; value: Option | null; onChange: (v: Option | null) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Option[]>([]);
  const [state, setState] = useState('');
  useEffect(() => {
    if (value || query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const r = await fetch('/api/inspection?' + new URLSearchParams({ mode: 'lookup', entity, q: query }), { signal: controller.signal });
        if (!r.ok) throw new Error();
        const data: Option[] = await r.json();
        setResults(data); setState(data.length ? '' : 'ไม่พบข้อมูล');
      } catch { if (!controller.signal.aborted) setState('ค้นหาไม่สำเร็จ กรุณาลองใหม่'); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, entity, value]);
  return <div>
    <label className="block font-semibold">{label}<input className={inputClass} value={value?.label ?? query} onChange={e => { onChange(null); setQuery(e.target.value); setResults([]); setState(''); }} placeholder={entity === 'vehicle' ? 'พิมพ์ทะเบียนรถ' : 'พิมพ์ชื่อหรือรหัสพนักงาน'} /></label>
    {value ? <p className="mt-1 text-sm font-semibold text-emerald-700">✓ เลือกแล้ว{value.category ? ' · ' + value.category : ''}</p> : <div className="mt-1">
      {state && <p role="status" className="text-sm text-slate-600">{state}</p>}
      {results.map(item => <button type="button" key={item.id} onClick={() => { onChange(item); setResults([]); }} className="block w-full border-b p-3 text-left hover:bg-violet-50">{item.label}{item.category ? ' · ' + item.category : ''}</button>)}
    </div>}
  </div>;
}

function Checklist({ labels, answers, onChange, people = false }: { labels: readonly string[]; answers: Answer[]; onChange: (i: number, answer: Answer) => void; people?: boolean }) {
  return <div className="grid gap-3 sm:grid-cols-2">{labels.map((label, i) => {
    const value = answers[i] ?? {};
    return <fieldset key={label} className="rounded-xl border border-slate-200 p-3">
      <legend className="px-1 font-semibold">{i + 1}. {label}</legend>
      {people ? <div className="grid grid-cols-2 gap-2">
        <label>ผ่าน (คน)<input required className={inputClass} type="number" min="0" max="1000" value={value.pass ?? ''} onChange={e => onChange(i, { ...value, pass: e.target.value === '' ? undefined : Number(e.target.value) })} /></label>
        <label>ไม่ผ่าน (คน)<input required className={inputClass} type="number" min="0" max="1000" value={value.fail ?? ''} onChange={e => { const fail = e.target.value === '' ? undefined : Number(e.target.value); onChange(i, { ...value, fail, status: fail === undefined ? undefined : fail > 0 ? 'fail' : 'pass' }); }} /></label>
      </div> : <div className="grid grid-cols-2 gap-2">{([['pass','ปกติ / ครบ'],['fail','ผิดปกติ / ไม่ครบ']] as const).map(([status, title]) => <button key={status} type="button" aria-pressed={value.status === status} onClick={() => onChange(i, { ...value, status })} className={`rounded-lg border px-2 py-3 text-sm font-bold ${value.status === status ? status === 'pass' ? 'border-emerald-600 bg-emerald-100 text-emerald-900' : 'border-red-600 bg-red-100 text-red-900' : 'border-slate-300'}`}>{title}</button>)}</div>}
      {value.status === 'fail' && <label className="mt-2 block text-sm font-semibold">สาเหตุ / สิ่งที่ขาด<input required maxLength={600} className={inputClass} value={value.note ?? ''} onChange={e => onChange(i, { ...value, note: e.target.value })} /></label>}
    </fieldset>;
  })}</div>;
}

export default function InspectionForm({ kind }: { kind: InspectionKind }) {
  const vehicleOnly = kind === 'vehicle';
  const [date, setDate] = useState('');
  const [vehicle, setVehicle] = useState<Option | null>(null);
  const [inspector, setInspector] = useState<Option | null>(null);
  const [supervisor, setSupervisor] = useState<Option | null>(null);
  const [items, setItems] = useState<Answer[]>([]);
  const [people, setPeople] = useState<Answer[]>([]);
  const [tools, setTools] = useState<Answer[]>([]);
  const [tasks, setTasks] = useState(['','','']);
  const [checks, setChecks] = useState([false,false,false]);
  const [counts, setCounts] = useState([0,0,0]);
  const [mileage, setMileage] = useState('');
  const [ready, setReady] = useState('');
  const [reason, setReason] = useState('');
  const [action, setAction] = useState('');
  const [toolAction, setToolAction] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [step, setStep] = useState(1);
  const [id, setId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<{ id: string; ready: boolean; approval: string | null } | null>(null);
  const category = vehicle?.category ?? 'รถยนต์';
  const update = (array: Answer[], setter: (value: Answer[]) => void) => (i: number, answer: Answer) => setter(Array.from({ length: Math.max(array.length, i + 1) }, (_, j) => j === i ? answer : array[j] ?? {}));

  function next(e: FormEvent) {
    e.preventDefault(); setError('');
    if (!vehicle || !inspector || (!vehicleOnly && !supervisor)) { setError('กรุณาเลือกข้อมูลจากผลค้นหาให้ครบ'); return; }
    if (!id) setId(crypto.randomUUID());
    setStep(2); window.scrollTo(0, 0);
  }
  async function submit(e: FormEvent) {
    e.preventDefault(); setError('');
    if (!vehicle || !inspector || busy) return;
    const complete = (arr: Answer[], total: number) => arr.length === total && arr.every(a => !!a.status);
    if (vehicleOnly ? !complete(items, vehicleChecks[category].length) : !ready || !complete(people, workerChecks.length) || !complete(tools, toolChecks.length)) {
      setError('กรุณาระบุผลตรวจให้ครบทุกข้อ'); return;
    }
    setBusy(true);
    try {
      const image = photo ? await preparePhoto(photo) : null;
      const payload = { kind, date: date || thaiInspectionDay(), id, vehicleId: vehicle.id, inspectorId: inspector.id, supervisorId: supervisor?.id,
        mileage, items, people, tools, tasks, vehicleChecks: checks, male: counts[0], female: counts[1], absent: counts[2],
        carReady: ready === 'yes', carReason: reason, carAction: action, toolAction, photo: image, note };
      const r = await fetch('/api/inspection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'บันทึกไม่สำเร็จ');
      setSaved(data); window.scrollTo(0, 0);
    } catch (e) { setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-4xl space-y-5 px-4 py-8 text-slate-900">
    <Link href="/inspection" className="font-semibold text-violet-700">← Inspection</Link>
    <header><h1 className="text-3xl font-extrabold">{vehicleOnly ? 'ตรวจสภาพยานพาหนะ' : 'ตรวจความพร้อมก่อนเริ่มงาน'}</h1><p className="mt-2 text-slate-600">บันทึกผลตรวจภาคสนาม · สาขาระโนด</p></header>
    {saved ? <section className={boxClass} role="status"><h2 className="text-xl font-bold text-emerald-800">บันทึกผลตรวจแล้ว</h2><p>{saved.ready ? 'ผลตรวจ: พร้อม' : 'ผลตรวจ: พบข้อที่ต้องติดตาม'}</p>{saved.approval && <p className="font-bold text-amber-800">รออนุมัติ — ยังไม่ได้รับอนุญาตให้เริ่มงานจากระบบนี้</p>}<p className="break-all text-sm">เลขอ้างอิง {saved.id}</p><Link href="/inspection/dashboard" className="text-violet-700 underline">ดูแดชบอร์ด</Link></section> :
      <><p className="font-bold text-violet-700">ขั้นที่ {step} / 2 · {step === 1 ? 'ข้อมูลผู้ตรวจและรถ' : 'รายการตรวจและหลักฐาน'}</p>
      {step === 1 ? <form className={boxClass} onSubmit={next}>
        <label className="block font-semibold">วันที่ตรวจ<input className={inputClass} type="date" value={date} max={thaiInspectionDay()} onChange={e => setDate(e.target.value)} /><span className="text-sm text-slate-600">หากไม่เลือก จะใช้วันนี้ตามเวลาไทย</span></label>
        <Lookup label="ทะเบียนรถ" entity="vehicle" value={vehicle} onChange={v => { if (vehicle?.id !== v?.id) setItems([]); setVehicle(v); }} />
        <Lookup label="ผู้ตรวจสอบ" entity="employee" value={inspector} onChange={setInspector} />
        {!vehicleOnly && <Lookup label="ผู้ควบคุมงาน" entity="employee" value={supervisor} onChange={setSupervisor} />}
        {error && <p role="alert" className="font-semibold text-red-700">{error}</p>}
        <button className={primary}>ไปที่รายการตรวจ →</button>
      </form> : <form onSubmit={submit} className="space-y-4">
        <section className={boxClass}><p className="font-bold">{vehicle?.label} · {inspector?.label}</p><button type="button" className="text-violet-700 underline" disabled={busy} onClick={() => { setStep(1); setError(''); }}>แก้ไขข้อมูลรถหรือผู้ตรวจ</button></section>
        {vehicleOnly ? <section className={boxClass}>
          <label className="block font-semibold">เลขไมล์ (กม.)<input required type="number" min="0" step="1" className={inputClass} value={mileage} onChange={e => setMileage(e.target.value)} /></label>
          <h2 className="text-lg font-bold">เช็กลิสต์ · {category}</h2><Checklist labels={vehicleChecks[category]} answers={items} onChange={update(items, setItems)} />
        </section> : <>
          <section className={boxClass}><h2 className="text-lg font-bold">งานและผู้ปฏิบัติงาน</h2>
            {tasks.map((t, i) => <label key={i} className="block">งานที่ {i + 1}{i > 0 && ' (ถ้ามี)'}<input className={inputClass} required={i === 0} maxLength={600} value={t} onChange={e => setTasks(tasks.map((x,j) => i === j ? e.target.value : x))} /></label>)}
            <div className="grid grid-cols-3 gap-2">{['ชาย','หญิง','ขาด'].map((label, i) => <label key={label}>{label} (คน)<input className={inputClass} type="number" min="0" max="1000" required value={counts[i]} onChange={e => setCounts(counts.map((x,j) => i === j ? Number(e.target.value) : x))} /></label>)}</div>
            <p>ผู้ปฏิบัติงานที่มา {counts[0] + counts[1]} คน · ขาด {counts[2]} คน</p>
            <Checklist labels={workerChecks} answers={people} onChange={update(people, setPeople)} people />
          </section>
          <section className={boxClass}><h2 className="text-lg font-bold">ยานพาหนะ</h2>{jobVehicleChecks.map((label, i) => <label key={label} className="flex items-start gap-3 py-1"><input type="checkbox" className="mt-1 size-5" checked={checks[i]} onChange={e => setChecks(checks.map((x,j) => i === j ? e.target.checked : x))} />{label}</label>)}
            <label className="block">ผลตรวจรถ<select required className={inputClass} value={ready} onChange={e => setReady(e.target.value)}><option value="">เลือกผลตรวจ</option><option value="yes">พร้อมใช้งาน</option><option value="no">ไม่พร้อมใช้งาน</option></select></label>
            {ready === 'no' && <><label className="block">สาเหตุ<input required className={inputClass} value={reason} onChange={e => setReason(e.target.value)} /></label><label className="block">การแก้ไขป้องกัน<input required className={inputClass} value={action} onChange={e => setAction(e.target.value)} /></label></>}
          </section>
          <section className={boxClass}><h2 className="text-lg font-bold">เครื่องมือและอุปกรณ์</h2><Checklist labels={toolChecks} answers={tools} onChange={update(tools, setTools)} />
            {tools[1]?.status === 'fail' && <label className="block">การแก้ไขป้องกัน<input required className={inputClass} value={toolAction} onChange={e => setToolAction(e.target.value)} /></label>}
          </section>
        </>}
        <section className={boxClass}>
          <label className="block font-semibold">รูปหลักฐาน {vehicleOnly && category !== 'โฟล์คลิฟท์' ? '(จำเป็น)' : '(ถ้ามี)'}<input type="file" accept="image/jpeg,image/png,image/webp" required={vehicleOnly && category !== 'โฟล์คลิฟท์' && !photo} className={inputClass} onChange={e => setPhoto(e.target.files?.[0] ?? null)} /></label>
          {photo && <p className="break-all text-sm">ไฟล์ที่เลือก: {photo.name}</p>}
          <label className="block font-semibold">{vehicleOnly ? 'หมายเหตุเร่งด่วน' : 'ข้อคิดเห็นผู้ตรวจสอบ'}<textarea className={inputClass} maxLength={600} rows={3} value={note} onChange={e => setNote(e.target.value)} /></label>
          {error && <p role="alert" className="font-semibold text-red-700">{error}</p>}
          <button disabled={busy} className={primary}>{busy ? 'กำลังบันทึก…' : vehicleOnly ? 'บันทึกผลตรวจรถ' : 'บันทึกและส่งรออนุมัติ'}</button>
        </section>
      </form>}</>}
  </main>;
}
