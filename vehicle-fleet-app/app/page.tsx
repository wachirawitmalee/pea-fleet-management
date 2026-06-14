"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Home() {
  const [stats, setStats] = useState({
    totalVehicles: 0, availableVehicles: 0, inUseVehicles: 0, totalReservations: 0,
    topDepartments: [] as any[], topVehicles: [] as any[], vehicleStatus: [] as any[], activeBookings: [] as any[],
    alerts: [] as any[] // 🌟 เพิ่ม State รับการแจ้งเตือน
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) setStats(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (b: any, type: 'IN' | 'OUT') => {
    const reservationId = b.reservationId;
    const mileageOut = b.checkInOutLog ? b.checkInOutLog.mileageOut : 0;

    const { value: formValues } = await Swal.fire({
      title: `<span style="color: ${type === 'IN' ? '#059669' : '#e11d48'}; font-weight: 800; font-size: 1.5rem;">${type === 'IN' ? '🟢 รับรถ (Check-in)' : '🔴 คืนรถ (Check-out)'}</span>`,
      html: `
        <div class="text-left space-y-4 mt-4 font-sans" style="text-align: left;">
          ${type === 'OUT' ? `<div style="background: #eff6ff; padding: 12px; border-radius: 14px; border: 1px solid #bfdbfe; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;"><span style="font-size: 0.85rem; font-weight: 700; color: #1e3a8a;">🔢 เลขไมล์ตอนออกรถ (ขาไป):</span><span style="font-size: 1.2rem; font-weight: 800; color: #1e40af;">${mileageOut} กม.</span></div>` : ''}
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #475569; margin-bottom: 6px;">เลขไมล์ปัจจุบันบนหน้าปัดรถ <span style="color: red;">*</span></label>
            <input id="swal-mileage" type="number" style="width: 100%; padding: 12px; border-radius: 12px; border: 1px solid #cbd5e1; outline: none; background: #f8fafc; font-size: 1.1rem; font-weight: 700;" placeholder="กรอกตัวเลขไมล์รถ" 
              oninput="${type === 'OUT' ? `const dist = this.value - ${mileageOut}; document.getElementById('calc-dist').innerText = dist >= 0 ? dist + ' กม.' : '❌ เลขไมล์ผิดปกติ (ติดลบ)';` : ''}" />
          </div>
          ${type === 'OUT' ? `<div style="background: #ecfdf5; padding: 12px; border-radius: 14px; border: 1px solid #a7f3d0; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;"><span style="font-size: 0.85rem; font-weight: 700; color: #064e3b;">📊 ระยะทางสุทธิในทริปนี้:</span><span id="calc-dist" style="font-size: 1.2rem; font-weight: 800; color: #047857;">0 กม.</span></div>` : ''}
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #475569; margin-bottom: 6px;">📸 ถ่ายรูปหน้าปัดรถ (ถ้ามี)</label>
            <input id="swal-photo" type="file" accept="image/*" capture="environment" style="width: 100%; padding: 10px; border-radius: 12px; border: 1px solid #cbd5e1; background: #f8fafc; font-size: 0.85rem;" />
          </div>
          ${type === 'OUT' ? `<div><label style="display: block; font-size: 0.85rem; font-weight: 700; color: #475569; margin-bottom: 6px;">📝 หมายเหตุรายงานปัญหา (ถ้ามี)</label><textarea id="swal-remark" rows="2" style="width: 100%; padding: 12px; border-radius: 12px; border: 1px solid #cbd5e1; outline: none; background: #f8fafc; font-size: 0.9rem;" placeholder="เช่น รถมีรอยขูดขีด..."></textarea></div>` : ''}
        </div>
      `,
      showCancelButton: true, confirmButtonText: '📦 บันทึกข้อมูล', cancelButtonText: 'ยกเลิก', confirmButtonColor: type === 'IN' ? '#10b981' : '#f43f5e',
      customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl px-6 py-3 font-bold', cancelButton: 'rounded-xl px-6 py-3 font-bold' },
      preConfirm: async () => {
        const m = (document.getElementById('swal-mileage') as HTMLInputElement).value;
        const fileInput = (document.getElementById('swal-photo') as HTMLInputElement);
        const r = document.getElementById('swal-remark') ? (document.getElementById('swal-remark') as HTMLTextAreaElement).value : '';
        if (!m) return Swal.showValidationMessage('⚠️ กรุณากรอกเลขไมล์ปัจจุบันก่อนครับ!');
        if (type === 'OUT' && parseInt(m, 10) < mileageOut) return Swal.showValidationMessage(`❌ ไมล์ขากลับ (${m}) น้อยกว่าขาไป (${mileageOut}) เป็นไปไม่ได้!`);
        
        let base64Photo = '';
        if (fileInput.files && fileInput.files[0]) {
          const file = fileInput.files[0];
          base64Photo = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        }
        return { mileage: m, photoUrl: base64Photo, remark: r };
      }
    });

    if (formValues) {
      const res = await fetch('/api/check-in-out', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reservationId, type, ...formValues }) });
      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ!', showConfirmButton: false, timer: 1500, customClass: { popup: 'rounded-[2rem]' } });
        fetchDashboardData(); 
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans pb-16">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">PEA</div>
            <span className="font-bold text-xl text-slate-800 hidden sm:block">Fleet Management</span>
          </div>
          <div className="text-sm font-bold text-purple-700 bg-purple-100 px-4 py-2 rounded-full border border-purple-200 shadow-sm">
            สถานที่ปฏิบัติงาน: สาขาระโนด
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 sm:mt-16 relative z-10">
        
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-800 mb-4 tracking-tight">ระบบบริหารจัดการรถยนต์</h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">จองรถล่วงหน้า ตรวจสอบคิว และสแกนรับ-คืนรถยนต์อย่างเป็นระบบ</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 max-w-6xl mx-auto mb-16">
          <Link href="/reservation" className="group bg-white/70 backdrop-blur-md p-6 rounded-[2rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl hover:-translate-y-1 transition-all text-center">
            <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-sm"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg></div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">จองรถยนต์</h3><p className="text-slate-500 text-xs">ขอใช้รถล่วงหน้า</p>
          </Link>
          <Link href="/schedule" className="group bg-white/70 backdrop-blur-md p-6 rounded-[2rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl hover:-translate-y-1 transition-all text-center">
            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-sm"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">ตารางคิว</h3><p className="text-slate-500 text-xs">เช็คคิวรถทั้งหมด</p>
          </Link>
          <Link href="/my-bookings" className="group bg-white/70 backdrop-blur-md p-6 rounded-[2rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden text-center">
            <div className="absolute top-0 right-0 p-4"><span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span></div>
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-sm"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">สแกนรถ</h3><p className="text-slate-500 text-xs">รับ-คืน ไมล์รถ</p>
          </Link>
          <Link href="/report-issue" className="group bg-white/70 backdrop-blur-md p-6 rounded-[2rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl hover:-translate-y-1 transition-all text-center">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-sm"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.83-5.83M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">แจ้งซ่อม</h3><p className="text-slate-500 text-xs">รายงานปัญหา</p>
          </Link>
          <Link href="/admin" className="group bg-white/70 backdrop-blur-md p-6 rounded-[2rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl hover:-translate-y-1 transition-all text-center">
            <div className="w-14 h-14 bg-slate-800 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-sm"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg></div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Admin</h3><p className="text-slate-500 text-xs">ผู้ดูแลระบบ</p>
          </Link>
        </div>

        <div className="max-w-6xl mx-auto space-y-10 mt-8">
          
          {/* 🌟 กล่องแจ้งเตือนอัจฉริยะ (Alerts) จะแสดงเฉพาะตอนที่มีปัญหาเท่านั้น */}
          {!isLoading && stats.alerts && stats.alerts.length > 0 && (
            <section>
              <div className="flex items-center gap-4 mb-4">
                <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2"><span className="text-3xl">🔔</span> ระบบแจ้งเตือนยานพาหนะ</h2>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.alerts.map((alert: any, idx: number) => (
                  <div key={idx} className={`p-4 rounded-2xl border-l-4 shadow-sm flex items-start gap-3 bg-white 
                    ${alert.level === 'danger' ? 'border-red-500 text-red-800' : alert.level === 'warning' ? 'border-amber-500 text-amber-800' : 'border-blue-500 text-blue-800'}`}>
                    <span className="text-2xl">{alert.icon}</span>
                    <div className="font-semibold text-sm mt-1 leading-snug" dangerouslySetInnerHTML={{ __html: alert.message }}></div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* แจ้งเตือนรถผิดเวลา / ลืมรับ / ลืมคืน */}
          <section>
            <div className="flex items-center gap-4 mb-6"><h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2"><span className="text-3xl">⚠️</span> คิวจองที่มีปัญหา (ลืมรับ/คืนรถ)</h2><div className="h-px bg-slate-200 flex-1"></div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.activeBookings.length === 0 ? (
                <div className="col-span-full bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 text-center text-emerald-600 font-bold">✅ ยอดเยี่ยม! ตอนนี้ไม่มีรถคันไหนเลยเวลาจอง หรือเลยเวลาคืนเลยครับ</div>
              ) : (
                stats.activeBookings.map((b: any) => (
                  <div key={b.reservationId} onClick={() => handleAction(b, b.reservationStatus === 'BOOKED' ? 'IN' : 'OUT')} className="p-5 rounded-2xl border-2 backdrop-blur-sm shadow-sm flex flex-col justify-between cursor-pointer hover:scale-105 transition-all duration-200 bg-red-50/80 border-red-200 hover:shadow-red-200">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-extrabold text-slate-800 text-lg">{b.vehicle.plateNumber}</span>
                        {b.overdueType === 'LATE_CHECKIN' ? <span className="px-2.5 py-1 bg-orange-500 text-white text-xs font-bold rounded-full animate-pulse shadow-sm">⚠️ ลืมมารับรถ!</span> : <span className="px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse shadow-sm">🚨 ลืมคืนรถ!</span>}
                      </div>
                      <p className="text-sm font-semibold text-slate-600">👤 {b.employee.fullName}</p>
                      <p className="text-xs text-slate-500 mt-1">📍 ปลายทาง: {b.destination}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-red-200 flex justify-between items-center"><p className="text-xs font-bold text-red-600">{b.overdueType === 'LATE_CHECKIN' ? `กำหนดรับ: ${b.startTime} น.` : `กำหนดคืน: ${b.endTime} น.`}</p><span className="text-xs font-bold bg-slate-800 text-white px-2 py-1 rounded-lg shadow-sm">กดเพื่ออัปเดต 👆</span></div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* สถิติ Dashboard */}
          <section>
            <div className="flex items-center gap-4 mb-6"><h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2"><span className="text-3xl">📊</span> ภาพรวมการใช้งานรถยนต์</h2><div className="h-px bg-slate-200 flex-1"></div></div>
            {isLoading ? (
              <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div></div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white/60 p-6 rounded-[2rem] border border-indigo-100 shadow-sm text-center"><p className="text-xs font-bold text-indigo-600 mb-1 uppercase">รถทั้งหมด</p><p className="text-4xl font-extrabold text-indigo-900">{stats.totalVehicles}</p></div>
                  <div className="bg-white/60 p-6 rounded-[2rem] border border-green-100 shadow-sm text-center"><p className="text-xs font-bold text-green-600 mb-1 uppercase">พร้อมใช้งาน</p><p className="text-4xl font-extrabold text-green-900">{stats.availableVehicles}</p></div>
                  <div className="bg-white/60 p-6 rounded-[2rem] border border-amber-100 shadow-sm text-center"><p className="text-xs font-bold text-amber-600 mb-1 uppercase">กำลังวิ่งงาน</p><p className="text-4xl font-extrabold text-amber-900">{stats.inUseVehicles}</p></div>
                  <div className="bg-white/60 p-6 rounded-[2rem] border border-purple-100 shadow-sm text-center"><p className="text-xs font-bold text-purple-600 mb-1 uppercase">จองสะสม</p><p className="text-4xl font-extrabold text-purple-900">{stats.totalReservations}</p></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/80 p-6 rounded-[2rem] border border-white shadow-sm"><h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">🍩 สัดส่วนสถานะรถยนต์</h3>
                    {stats.vehicleStatus.length > 0 ? (
                      <div className="h-64 w-full flex items-center justify-center relative"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stats.vehicleStatus} innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">{stats.vehicleStatus.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} stroke="transparent" />))}</Pie><Tooltip contentStyle={{ borderRadius: '12px' }} /></PieChart></ResponsiveContainer><div className="absolute flex flex-col items-center justify-center pointer-events-none"><span className="text-3xl font-extrabold text-slate-800">{stats.totalVehicles}</span></div></div>
                    ) : (<div className="h-64 flex items-center justify-center text-slate-400 font-medium">ยังไม่มีข้อมูล</div>)}
                  </div>
                  <div className="bg-white/80 p-6 rounded-[2rem] border border-white shadow-sm"><h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">🏆 แผนกที่ใช้รถเยอะที่สุด</h3>
                    {stats.topDepartments.length > 0 ? (
                      <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.topDepartments} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} /><YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ borderRadius: '12px' }} /><Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={40} /></BarChart></ResponsiveContainer></div>
                    ) : (<div className="h-64 flex items-center justify-center text-slate-400 font-medium">ยังไม่มีข้อมูล</div>)}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}