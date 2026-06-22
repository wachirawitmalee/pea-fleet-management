"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AdminDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [stats, setStats] = useState({
    totalVehicles: 0, availableVehicles: 0, inUseVehicles: 0, totalReservations: 0,
    topDepartments: [] as any[], topVehicles: [] as any[], vehicleStatus: [] as any[], activeBookings: [] as any[],
    alerts: [] as any[] 
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (localStorage.getItem('isAdminLoggedIn') === 'true') {
      setIsLoggedIn(true);
      fetchDashboardData();
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/dashboard', { cache: 'no-store' });
      if (res.ok) setStats(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === '1234') {
      localStorage.setItem('isAdminLoggedIn', 'true');
      setIsLoggedIn(true);
      Swal.fire({ icon: 'success', title: 'เข้าสู่ระบบสำเร็จ', showConfirmButton: false, timer: 1500, customClass: { popup: 'rounded-[2rem]' } });
      fetchDashboardData(); 
    } else {
      Swal.fire({ icon: 'error', title: 'ข้อมูลไม่ถูกต้อง', confirmButtonColor: '#9333ea', customClass: { popup: 'rounded-[2rem]' } });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdminLoggedIn');
    setIsLoggedIn(false); setUsername(''); setPassword('');
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden font-sans">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
        <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.08)] w-full max-w-md relative z-10 border border-white">
          <div className="text-center mb-8"><div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg></div><h2 className="text-3xl font-extrabold text-slate-800">Admin Login</h2></div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div><label className="block text-sm font-bold text-slate-700 mb-2">Username</label><input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold focus:ring-2 focus:ring-purple-500 outline-none transition-all" /></div>
            <div><label className="block text-sm font-bold text-slate-700 mb-2">Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold focus:ring-2 focus:ring-purple-500 outline-none transition-all" /></div>
            <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl transition-all shadow-md mt-4">เข้าสู่ระบบ</button>
          </form>
          <div className="mt-6 text-center"><Link href="/" className="text-sm text-purple-600 font-bold hover:underline">← กลับหน้าหลักผู้ใช้งาน</Link></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans relative">
      <nav className="bg-slate-900 text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3"><span className="bg-purple-600 p-1.5 rounded-lg"><svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></span><h1 className="text-lg font-bold">Admin Workspace</h1></div>
          <button onClick={handleLogout} className="text-sm bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-bold transition-colors shadow-sm">ออกจากระบบ</button>
        </div>
      </nav>

    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        
        {/* เมนูการจัดการ (เพิ่มเป็น 6 เมนูหลัก ปรับเป็น 3 คอลัมน์ให้เรียงสวยงาม) */}
        <section>
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><span className="w-2 h-6 bg-purple-600 rounded-full"></span> เมนูจัดการข้อมูล (Management)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <Link href="/admin/employees" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-purple-400 transition-all cursor-pointer group block">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg></div>
              <h3 className="font-bold text-lg text-slate-800 mb-1">จัดการพนักงาน</h3>
              <p className="text-slate-500 text-xs">เพิ่ม แก้ไข นำเข้าไฟล์พนักงาน</p>
            </Link>
            
            <Link href="/admin/vehicles" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-purple-400 transition-all cursor-pointer group block">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg></div>
              <h3 className="font-bold text-lg text-slate-800 mb-1">จัดการรถยนต์</h3>
              <p className="text-slate-500 text-xs">ตั้งค่าจอง พิมพ์ QR ดูประวัติซ่อม</p>
            </Link>
            
            <Link href="/admin/reservations" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-purple-400 transition-all cursor-pointer group block">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg></div>
              <h3 className="font-bold text-lg text-slate-800 mb-1">จัดการการจอง</h3>
              <p className="text-slate-500 text-xs">ดูตาราง ค้นหา และตรวจสอบประวัติไมล์</p>
            </Link>
            
            <Link href="/admin/maintenance" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-red-400 transition-all cursor-pointer group block">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path></svg></div>
              <h3 className="font-bold text-lg text-slate-800 mb-1">จัดการแจ้งซ่อม</h3>
              <p className="text-slate-500 text-xs">ควบคุม Workflow ซ่อมบำรุงและปิดงาน</p>
            </Link>

            {/* 🌟 2 เมนูใหม่ที่เพิ่มเข้ามา */}
            <Link href="/admin/fuel" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-cyan-400 transition-all cursor-pointer group block">
              <div className="w-12 h-12 bg-cyan-100 text-cyan-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg></div>
              <h3 className="font-bold text-lg text-slate-800 mb-1">เมนูค่าน้ำมัน</h3>
              <p className="text-slate-500 text-xs">บันทึกประวัติ และคำนวณค่าน้ำมัน</p>
            </Link>
            
            <Link href="/admin/settings" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-fuchsia-400 transition-all cursor-pointer group block">
              <div className="w-12 h-12 bg-fuchsia-100 text-fuchsia-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg></div>
              <h3 className="font-bold text-lg text-slate-800 mb-1">ตั้งค่าระบบแจ้งเตือน</h3>
              <p className="text-slate-500 text-xs">ผูกอีเมล รับรายงานเตือนภาษี / เช็คระยะ</p>
            </Link>

          </div>
        </section>

        {isLoading ? (
          <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <>
            {/* แจ้งเตือนภาษี / เช็คระยะ */}
            {stats.alerts && stats.alerts.length > 0 && (
              <section>
                <div className="flex items-center gap-4 mb-4">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><span className="w-2 h-6 bg-amber-500 rounded-full"></span> แจ้งเตือนภาษี / เช็คระยะ</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stats.alerts.map((alert: any, idx: number) => (
                    <div key={idx} className={`p-4 rounded-xl border-l-4 shadow-sm flex items-start gap-3 bg-white 
                      ${alert.level === 'danger' ? 'border-red-500 text-red-800' : alert.level === 'warning' ? 'border-amber-500 text-amber-800' : 'border-blue-500 text-blue-800'}`}>
                      <span className="text-xl">{alert.icon}</span>
                      <div className="font-semibold text-sm mt-0.5" dangerouslySetInnerHTML={{ __html: alert.message }}></div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* คิวการจองที่มีปัญหา */}
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><span className="w-2 h-6 bg-red-500 rounded-full"></span> Monitor ปัญหาลืมรับ/ลืมคืนรถ</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.activeBookings?.length === 0 ? (
                  <div className="col-span-full bg-emerald-50 p-6 rounded-2xl border border-emerald-100 text-center text-emerald-700 font-extrabold">✅ ปลอดภัยดี: ไม่มีปัญหาลืมรับหรือลืมคืนรถในขณะนี้ครับ</div>
                ) : (
                  stats.activeBookings?.map((b: any) => (
                    <div key={b.reservationId} className="p-5 rounded-2xl border-2 shadow-sm bg-red-50 border-red-200">
                      <div className="flex justify-between items-start mb-3">
                        <span className="font-extrabold text-slate-900 text-lg">{b.vehicle.plateNumber}</span>
                        {b.overdueType === 'LATE_CHECKIN' ? <span className="px-2.5 py-1 bg-orange-500 text-white text-xs font-bold rounded-lg animate-pulse">⚠️ ลืมมารับรถ!</span> : <span className="px-2.5 py-1 bg-red-600 text-white text-xs font-bold rounded-lg animate-pulse">🚨 เลยเวลาคืน!</span>}
                      </div>
                      <p className="text-sm font-extrabold text-slate-800">พนักงาน: {b.employee.fullName}</p>
                      <p className="text-xs font-bold text-slate-600 mt-1 mb-3">เป้าหมาย: {b.destination}</p>
                      <div className="p-2 rounded-xl text-xs font-extrabold text-center bg-red-200 text-red-900">
                        {b.overdueType === 'LATE_CHECKIN' ? `เลยเวลาเริ่ม: ${b.startTime} น.` : `เลยกำหนดคืน: ${b.endTime} น.`}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* สถิติ */}
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><span className="w-2 h-6 bg-slate-800 rounded-full"></span> ภาพรวมสถิติ (Overview)</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 text-center"><p className="text-xs font-extrabold text-indigo-700 mb-1 uppercase">รถทั้งหมด</p><p className="text-3xl font-extrabold text-indigo-900">{stats.totalVehicles}</p></div>
                <div className="bg-green-50 p-6 rounded-2xl border border-green-200 text-center"><p className="text-xs font-extrabold text-green-700 mb-1 uppercase">พร้อมใช้งาน</p><p className="text-3xl font-extrabold text-green-900">{stats.availableVehicles}</p></div>
                <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 text-center"><p className="text-xs font-extrabold text-amber-700 mb-1 uppercase">กำลังวิ่งงาน</p><p className="text-3xl font-extrabold text-amber-900">{stats.inUseVehicles}</p></div>
                <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 text-center"><p className="text-xs font-extrabold text-purple-700 mb-1 uppercase">จองสะสม</p><p className="text-3xl font-extrabold text-purple-900">{stats.totalReservations}</p></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm"><h3 className="text-lg font-extrabold text-slate-900 mb-4">สัดส่วนสถานะรถยนต์</h3>
                  {stats.vehicleStatus.length > 0 ? (
                    <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stats.vehicleStatus} innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">{stats.vehicleStatus.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
                  ) : (<div className="h-64 flex items-center justify-center text-slate-400 font-bold">ยังไม่มีข้อมูล</div>)}
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm"><h3 className="text-lg font-extrabold text-slate-900 mb-4">5 อันดับแผนกใช้รถเยอะสุด</h3>
                  {stats.topDepartments.length > 0 ? (
                    <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.topDepartments}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{fontWeight: 'bold', fill: '#475569'}} /><Tooltip /><Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
                  ) : (<div className="h-64 flex items-center justify-center text-slate-400 font-bold">ยังไม่มีข้อมูล</div>)}
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}