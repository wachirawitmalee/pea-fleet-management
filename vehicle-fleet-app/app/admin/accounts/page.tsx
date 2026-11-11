'use client';
import Link from 'next/link';
import { useEffect,useRef,useState,type FormEvent } from 'react';
import InspectionIcon from '@/app/inspection/inspection-icon';
type Employee={employeeId:string;fullName:string;enabled:boolean;workPlace?:string};
export default function AdminAccounts(){
  const accountPanel = useRef<HTMLHeadingElement>(null);
  const [rows,setRows]=useState<Employee[]>([]),[id,setId]=useState(''),[password,setPassword]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const [query,setQuery]=useState(''),[enabledOnly,setEnabledOnly]=useState(false),[loading,setLoading]=useState(true);
  async function refresh(){
    const r=await fetch('/api/admin/accounts');const data=await r.json();
    if(!r.ok)throw Error(data.error);setRows(data);
  }
  useEffect(()=>{refresh().catch(e=>setMessage(e.message)).finally(()=>setLoading(false));},[]);
  async function save(enabled:boolean){
    if(!id||busy)return;setBusy(true);setMessage('');
    try {const r=await fetch('/api/admin/accounts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({employeeId:id,password,enabled})});const data=await r.json();if(!r.ok)throw Error(data.error);setPassword('');await refresh();setMessage(enabled?'เปิดสิทธิ์และบันทึกรหัสผ่านแล้ว':'ยกเลิกสิทธิ์แล้ว');}
    catch(e){setMessage(e instanceof Error?e.message:'บันทึกไม่สำเร็จ');}finally{setBusy(false);}
  }
  const selected=rows.find(e=>e.employeeId===id);
  const normalized=query.trim().toLowerCase();
  const filtered=rows.filter(e=>(!enabledOnly||e.enabled)&&(e.fullName.toLowerCase().includes(normalized)||e.employeeId.includes(normalized)));
  function selectEmployee(employeeId: string) {
    setId(employeeId);
    setPassword('');
    setMessage('');
    accountPanel.current?.focus();
  }
  return <div className="min-h-screen bg-slate-50 text-slate-950"><main className="mx-auto max-w-6xl space-y-5 px-4 py-7">
    <Link href="/admin" className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-indigo-50"><span aria-hidden="true" className="mr-2">←</span> กลับหน้าผู้ดูแลระบบ</Link>
    <header className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50 p-6">
      <p className="text-xs font-bold tracking-widest text-indigo-700">SMART FLEET CARE · ADMIN</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-extrabold"><span className="rounded-xl bg-indigo-100 p-2 text-indigo-800"><InspectionIcon name="lock" className="size-6" /></span>จัดการบัญชีแอดมิน</h1>
      <p className="mt-2 text-slate-700">ค้นหาพนักงานด้วยชื่อหรือรหัส แล้วเลือกคนที่ต้องการจัดการสิทธิ์</p>
    </header>
    {!loading && rows.length > 0 && <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-900"><dt className="flex items-center gap-2 text-sm font-semibold"><InspectionIcon name="person" />พนักงานในรายการ</dt><dd className="mt-2 text-2xl font-extrabold">{rows.length} คน</dd></div>
      <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-teal-900"><dt className="flex items-center gap-2 text-sm font-semibold"><InspectionIcon name="check" />เปิดสิทธิ์แล้ว</dt><dd className="mt-2 text-2xl font-extrabold">{rows.filter(employee => employee.enabled).length} คน</dd></div>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950"><dt className="flex items-center gap-2 text-sm font-semibold"><InspectionIcon name="lock" />ยังไม่มีสิทธิ์</dt><dd className="mt-2 text-2xl font-extrabold">{rows.filter(employee => !employee.enabled).length} คน</dd></div>
    </dl>}
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold"><span className="rounded-lg bg-sky-100 p-2 text-sky-800"><InspectionIcon name="search" /></span>1. ค้นหาและเลือกพนักงาน</h2>
        <label className="block"><span className="sr-only">ค้นหาพนักงาน</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="พิมพ์ชื่อหรือรหัสพนักงาน" className="block w-full rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 text-slate-950" /></label>
        <label className="my-3 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={enabledOnly} onChange={e=>setEnabledOnly(e.target.checked)} /> แสดงเฉพาะแอดมินที่เปิดใช้งาน</label>
        <p className="mb-2 text-sm text-slate-600">{loading?'กำลังโหลดรายชื่อ…':filtered.length+' คน'}</p>
        {!loading && !filtered.length && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">ไม่พบพนักงาน ลองเปลี่ยนคำค้นหรือตัวกรอง</p>}
        <ul className="max-h-96 divide-y divide-slate-100 overflow-auto">{filtered.map(e=><li key={e.employeeId}><button type="button" disabled={busy} aria-pressed={id===e.employeeId} onClick={()=>selectEmployee(e.employeeId)} className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-xl p-3 text-left hover:bg-indigo-50 ${id===e.employeeId?'bg-indigo-100':''}`}><span><strong className="block">{e.fullName}</strong><span className="text-xs text-slate-600">{e.employeeId} · {e.workPlace||'กฟส.ระโนด'}</span></span><span className={`rounded-full px-2 py-1 text-xs font-bold ${e.enabled?'bg-teal-100 text-teal-900':'bg-slate-100 text-slate-700'}`}>{e.enabled?'เปิดสิทธิ์แล้ว':'ยังไม่มีสิทธิ์'}</span></button></li>)}</ul>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 ref={accountPanel} tabIndex={-1} className="flex items-center gap-2 text-lg font-extrabold"><span className="rounded-lg bg-indigo-100 p-2 text-indigo-800"><InspectionIcon name="lock" /></span>2. จัดการบัญชีที่เลือก</h2>
        {selected ? <form className="mt-3 space-y-4" onSubmit={(e:FormEvent)=>{e.preventDefault();void save(true);}}>
          <div className="rounded-xl bg-indigo-50 p-3"><p className="font-bold">{selected.fullName}</p><p className="text-sm text-slate-700">ชื่อเข้าใช้: {selected.employeeId} · {selected.enabled ? 'เปิดสิทธิ์แล้ว' : 'ยังไม่มีสิทธิ์'}</p></div>
          <label className="block font-semibold">{selected.enabled?'ตั้งรหัสผ่านใหม่':'ตั้งรหัสผ่าน'}<input type="password" autoComplete="new-password" required minLength={10} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-950" /></label>
          <p className="text-sm text-slate-600">ใช้รหัสผ่านอย่างน้อย 10 ตัวอักษร</p>
          <div className="flex flex-wrap gap-3"><button disabled={busy} className="rounded-xl border border-indigo-200 bg-indigo-100 px-4 py-3 font-bold text-indigo-950 hover:bg-indigo-200 disabled:opacity-50">{busy?'กำลังบันทึก…':selected.enabled?'บันทึกรหัสใหม่':'เปิดสิทธิ์แอดมิน'}</button>{selected.enabled&&<button disabled={busy} type="button" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 font-bold text-rose-900" onClick={()=>{if(window.confirm('ยืนยันยกเลิกสิทธิ์แอดมินของ '+selected.fullName+'?'))void save(false);}}>ยกเลิกสิทธิ์</button>}</div>
        </form> : <p className="mt-2 text-sm text-slate-600">เลือกพนักงานจากรายการเพื่อเปิดสิทธิ์หรือเปลี่ยนรหัสผ่าน</p>}
        {message&&<p role="status" className="mt-4 rounded-xl bg-indigo-50 p-3">{message}</p>}
      </section>
    </div>
  </main></div>;
}
