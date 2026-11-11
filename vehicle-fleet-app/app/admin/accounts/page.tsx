'use client';
import Link from 'next/link';
import { useEffect,useState,type FormEvent } from 'react';
type Employee={employeeId:string;fullName:string;enabled:boolean};
export default function AdminAccounts(){
  const [rows,setRows]=useState<Employee[]>([]),[id,setId]=useState(''),[password,setPassword]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  async function refresh(){
    const r=await fetch('/api/admin/accounts');const data=await r.json();
    if(!r.ok)throw Error(data.error);setRows(data);
  }
  useEffect(()=>{refresh().catch(e=>setMessage(e.message));},[]);
  async function save(enabled:boolean){
    if(!id||busy)return;setBusy(true);setMessage('');
    try {const r=await fetch('/api/admin/accounts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({employeeId:id,password,enabled})});const data=await r.json();if(!r.ok)throw Error(data.error);setPassword('');await refresh();setMessage(enabled?'เปิดสิทธิ์และบันทึกรหัสผ่านแล้ว':'ยกเลิกสิทธิ์แล้ว');}
    catch(e){setMessage(e instanceof Error?e.message:'บันทึกไม่สำเร็จ');}finally{setBusy(false);}
  }
  return <main className="mx-auto max-w-3xl space-y-4 p-6 text-slate-900">
    <Link href="/admin" className="font-bold text-indigo-700">← ผู้ดูแลระบบ</Link>
    <h1 className="text-2xl font-bold">จัดการบัญชีแอดมิน</h1>
    <p className="text-sm text-slate-600">ใช้รหัสพนักงานเป็นชื่อเข้าใช้ เฉพาะแอดมินสูงสุดจัดการสิทธิ์ได้</p>
    <form className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5" onSubmit={(e:FormEvent)=>{e.preventDefault();void save(true);}}>
      <label className="block font-semibold">เลือกพนักงาน<select required value={id} onChange={e=>{setId(e.target.value);setPassword('');}} className="mt-1 block w-full rounded-xl border border-slate-300 p-3"><option value="">เลือกจากรายชื่อ</option>{rows.map(e=><option key={e.employeeId} value={e.employeeId}>{e.employeeId} · {e.fullName}{e.enabled?' · เป็นแอดมินแล้ว':''}</option>)}</select></label>
      <label className="block font-semibold">ตั้งรหัสผ่าน<input type="password" autoComplete="new-password" required minLength={10} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 p-3" /></label>
      <div className="flex flex-wrap gap-3"><button disabled={busy} className="rounded-xl bg-indigo-700 px-4 py-3 font-bold text-white">เปิดสิทธิ์ / ตั้งรหัสผ่าน</button>{rows.some(e=>e.employeeId===id&&e.enabled)&&<button disabled={busy} type="button" className="rounded-xl border border-red-200 px-4 py-3 font-bold text-red-800" onClick={()=>save(false)}>ยกเลิกสิทธิ์</button>}</div>
    </form>
    {message&&<p role="status" className="rounded-xl bg-indigo-50 p-3">{message}</p>}
    <h2 className="font-bold">แอดมินที่เปิดใช้งาน</h2><ul>{rows.filter(e=>e.enabled).map(e=><li key={e.employeeId}>{e.employeeId} · {e.fullName}</li>)}</ul>
  </main>;
}
