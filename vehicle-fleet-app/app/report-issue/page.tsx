"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';

// 🌟 1. Import Helper Functions มาใช้งาน
import { showLoading, showError } from '@/lib/alert';

export default function ReportIssuePage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [allTickets, setAllTickets] = useState<any[]>([]);
  
  // States สำหรับฟอร์มแจ้งซ่อม
  const [employeeId, setEmployeeId] = useState('');
  const [fullName, setFullName] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [mileage, setMileage] = useState('');
  const [issueDesc, setIssueDesc] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // States สำหรับ Timeline Modal
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [timelineData, setTimelineData] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [empRes, vehRes, ticketRes] = await Promise.all([
        fetch('/api/employees', { cache: 'no-store' }), 
        fetch('/api/vehicles', { cache: 'no-store' }),
        fetch('/api/maintenance', { cache: 'no-store' })
      ]);
      setEmployees(await empRes.json());
      setVehicles(await vehRes.json());
      setAllTickets(await ticketRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // 🌟 ดึงชื่อพนักงานอัตโนมัติ 6-7 หลัก พร้อมระบบบล็อกรหัสพนักงานที่ถูกระงับสิทธิ์ (INACTIVE)
  useEffect(() => {
    if (employeeId.length >= 6) {
      const found = employees.find(e => e.employeeId === employeeId);
      
      if (found) {
        // ตรวจสอบสถานะว่าพนักงานคนนี้พ้นสภาพ หรือลาออก/ย้ายไปแล้วหรือไม่
        if (found.status === 'INACTIVE') {
          setFullName('');
          // 🌟 2. ใช้ Helper Function แจ้ง Error
          showError('รหัสพนักงานถูกระงับสิทธิ์', 'พนักงานรหัสนี้พ้นสภาพการทำงานหรือย้ายสังกัดแล้ว ไม่สามารถแจ้งซ่อมยานพาหนะได้ครับ');
        } else {
          // ถ้าเป็นสถานะ ACTIVE ดึงชื่อมาแสดงปกติ
          setFullName(found.fullName);
        }
      } else {
        setFullName('');
      }
    } else {
      setFullName('');
    }
  }, [employeeId, employees]);

  // คัดกรองเฉพาะใบแจ้งซ่อมของพนักงานคนนี้
  const myTickets = allTickets.filter(t => t.employeeId === employeeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !fullName || !vehicleId || !mileage || !issueDesc) {
      // 🌟 3. ใช้ Helper Function แจ้ง Error ข้อมูลไม่ครบ
      showError('ข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลให้ครบทุกช่อง (*)');
      return;
    }

    setIsSubmitting(true);
    
    // 🌟 4. เรียก Loading Spinner ทันทีที่กดปุ่มแจ้งซ่อม
    showLoading('กำลังส่งข้อมูล...', 'ระบบกำลังบันทึกใบแจ้งซ่อมและล็อกสถานะรถ');

    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, vehicleId, mileage: parseInt(mileage), issueDesc })
      });
      
      if (res.ok) {
        const { data: newTicket } = await res.json();
        
        fetchData(); 
        setVehicleId('');
        setMileage('');
        setIssueDesc('');

        // 🌟 5. คง Custom Swal ของเดิมไว้ เพราะมีปุ่ม "พิมพ์ใบแจ้งซ่อม" ที่ออกแบบไว้เฉพาะหน้านี้
        Swal.fire({ 
          title: 'ส่งเรื่องแจ้งซ่อมสำเร็จ!', 
          html: `
            <div class="mt-4 font-sans text-center">
              <p class="text-sm font-bold text-slate-500">เลขที่ใบแจ้งซ่อมของคุณคือ</p>
              <div class="text-4xl font-extrabold text-red-600 my-3 tracking-wider bg-red-50 py-3 rounded-2xl border border-red-100">${newTicket.ticketNumber}</div>
              <p class="text-sm font-medium text-slate-500 mb-6">รถคันนี้ถูกล็อกสถานะเพื่อเตรียมเข้าอู่เรียบร้อยแล้ว</p>
              
              <a href="/admin/maintenance/print/${newTicket.ticketId}" target="_blank" class="inline-flex items-center justify-center gap-2 w-full bg-amber-100 text-amber-700 border-2 border-amber-300 px-6 py-4 rounded-xl font-bold hover:bg-amber-200 transition-colors text-lg shadow-sm">
                🖨️ พิมพ์ใบแจ้งซ่อม (PDF)
              </a>
            </div>
          `,
          showConfirmButton: true, 
          confirmButtonText: 'ปิดหน้าต่าง',
          confirmButtonColor: '#1e293b',
          customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl px-8 py-3 font-bold' } 
        });
        
      } else {
        const data = await res.json();
        // 🌟 6. ใช้ Helper Function แสดง Error จาก API
        showError('เกิดข้อผิดพลาด', data.error || 'ไม่สามารถบันทึกข้อมูลได้');
      }
    } catch (e) {
      // 🌟 7. ใช้ Helper Function แสดง Error เชื่อมต่อ
      showError('เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว', 'กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenTimeline = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/maintenance/timeline?id=${ticketId}`);
      if (res.ok) {
        setTimelineData(await res.json());
        setIsTimelineOpen(true);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16 font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-red-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
      
      <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-red-600 transition-colors group">
            <div className="p-2 bg-slate-100 rounded-full group-hover:bg-red-100 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg></div>
            <span className="font-semibold hidden sm:block">กลับหน้าหลัก</span>
          </Link>
          <div className="text-center">
            <h1 className="text-xl font-bold text-slate-800">ฟอร์มแจ้งซ่อมรถยนต์</h1>
            <p className="text-xs text-red-600 font-bold">แจ้งปัญหาเพื่อส่งซ่อมบำรุง</p>
          </div>
          <div className="w-[100px]"></div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 mt-8 relative z-10 space-y-8">
        
        {/* ส่วนฟอร์มแจ้งซ่อม */}
        <div className="bg-white/90 backdrop-blur-md p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white">
          <div className="mb-8 text-center">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border-4 border-white"><svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg></div>
            <h2 className="text-2xl font-extrabold text-slate-800">แจ้งปัญหารถยนต์ชำรุด</h2>
            <p className="text-slate-500 mt-2">เมื่อกดส่งข้อมูล รถคันนี้จะถูกล็อกสถานะเพื่อเตรียมเข้าอู่ทันที</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-300 space-y-4 shadow-sm">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><span className="text-xl">👤</span> ข้อมูลผู้แจ้ง</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">รหัสพนักงาน *</label>
                  <input type="text" maxLength={7} value={employeeId} onChange={(e) => setEmployeeId(e.target.value.replace(/[^0-9]/g, ''))} className="w-full p-3 rounded-xl border border-slate-400 bg-white outline-none focus:ring-2 focus:ring-red-500 font-mono font-extrabold text-slate-950 placeholder:text-slate-400 shadow-sm" placeholder="ระบุรหัส 6-7 หลัก" />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">ชื่อ-นามสกุล (ดึงอัตโนมัติ)</label>
                  <input type="text" disabled value={fullName} className="w-full p-3 rounded-xl border border-slate-300 bg-slate-100 text-slate-900 outline-none font-extrabold cursor-not-allowed" placeholder="รอข้อมูลพนักงาน..." />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-300 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><span className="text-xl">🚙</span> รถยนต์ที่พบปัญหา <span className="text-red-500 text-sm">*</span></h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {vehicles.map((v) => {
                  const isMaintenance = v.vehicleStatus === 'MAINTENANCE';
                  return (
                    <label key={v.vehicleId} className={`relative flex items-center p-4 border-2 rounded-2xl transition-all duration-200 ${isMaintenance ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed' : vehicleId === v.vehicleId ? 'border-red-500 bg-red-50 shadow-md cursor-pointer' : 'border-slate-300 hover:border-red-300 bg-white cursor-pointer'}`}>
                      <input type="radio" name="vehicle" value={v.vehicleId} disabled={isMaintenance} checked={vehicleId === v.vehicleId} onChange={() => setVehicleId(v.vehicleId)} className="hidden" />
                      <div className="flex flex-col flex-1 min-w-0 pr-2">
                        <span className="font-extrabold text-slate-900 text-lg truncate">{v.plateNumber}</span>
                        <span className="text-xs text-slate-600 font-bold truncate">{v.brand}</span>
                      </div>
                      <div className="ml-auto flex-shrink-0">
                        {isMaintenance ? (<span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-lg border border-red-200 whitespace-nowrap">🛠️ ส่งซ่อมอยู่</span>) : (<span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 whitespace-nowrap">เลือกรถคันนี้</span>)}
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-300 space-y-4 shadow-sm">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><span className="text-xl">0️⃣</span> รายละเอียดปัญหา</h3>
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">เลขไมล์ปัจจุบัน (กม.) *</label>
                <input type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} className="w-full p-3 rounded-xl border border-slate-400 bg-white outline-none focus:ring-2 focus:ring-red-500 font-extrabold text-slate-950 placeholder:text-slate-400 shadow-sm" placeholder="กรอกตัวเลขไมล์ปัจจุบัน" />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">อาการชำรุด / ปัญหาที่พบ *</label>
                <textarea rows={4} value={issueDesc} onChange={(e) => setIssueDesc(e.target.value)} className="w-full p-3 rounded-xl border border-slate-400 bg-white outline-none focus:ring-2 focus:ring-red-500 font-bold text-slate-950 placeholder:text-slate-400 shadow-sm" placeholder="อธิบายอาการชำรุดอย่างละเอียด..." />
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className={`w-full text-white font-extrabold py-4 rounded-xl transition-all shadow-lg text-lg ${isSubmitting ? 'bg-slate-400 cursor-wait' : 'bg-red-600 hover:bg-red-700'}`}>
              {isSubmitting ? 'กำลังส่งข้อมูล...' : 'ส่งเรื่องแจ้งซ่อม'}
            </button>
          </form>
        </div>

        {/* ประวัติการแจ้งซ่อมย้อนหลัง */}
        {fullName && (
          <div className="bg-white/90 backdrop-blur-md p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white">
            <h3 className="font-extrabold text-slate-800 text-lg mb-4 flex items-center gap-2">
              <span className="text-2xl">📋</span> ประวัติการแจ้งซ่อมของคุณ
            </h3>
            
            {myTickets.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-600 font-bold">
                คุณยังไม่มีประวัติการแจ้งซ่อมรถยนต์ในระบบครับ
              </div>
            ) : (
              <div className="space-y-4">
                {myTickets.map(t => (
                  <div key={t.ticketId} className="bg-white border-2 border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-red-300 transition-colors">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-extrabold text-red-600 text-lg">{t.ticketNumber}</span>
                        <span className="px-2.5 py-1 bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-300">{t.status}</span>
                      </div>
                      <p className="font-extrabold text-slate-900 text-sm">รถยนต์: {t.vehicle.plateNumber} ({t.vehicle.brand})</p>
                      <p className="text-slate-600 text-xs font-bold mt-1">วันที่แจ้ง: {new Date(t.requestDate).toLocaleDateString('th-TH')}</p>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <button onClick={() => handleOpenTimeline(t.ticketId)} className="flex-1 md:flex-none px-4 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-xl font-bold text-sm border border-blue-300">
                        ⏱️ ดูไทม์ไลน์
                      </button>
                      <a href={`/admin/maintenance/print/${t.ticketId}`} target="_blank" className="flex-1 md:flex-none text-center px-4 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl font-bold text-sm border border-amber-300">
                        🖨️ พิมพ์ซ้ำ
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* MODAL: แสดงผล Timeline */}
      {isTimelineOpen && timelineData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2rem] border border-slate-300 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-100">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">ไทม์ไลน์งานซ่อม</h3>
                <p className="text-sm font-bold text-red-600 mt-1">เลขที่: {timelineData.ticketNumber} | ทะเบียน: {timelineData.plateNumber}</p>
              </div>
              <button onClick={() => setIsTimelineOpen(false)} className="w-10 h-10 bg-white border border-slate-300 rounded-full font-bold text-slate-700 hover:bg-red-100">✕</button>
            </div>
            <div className="p-6 overflow-y-auto bg-white flex-1">
              <div className="text-center mb-6"><span className="inline-block px-4 py-2 bg-slate-100 text-slate-800 font-extrabold rounded-full text-sm border border-slate-300">เวลาที่ใช้ไปทั้งหมด: <span className="text-red-600">{timelineData.totalDays} วัน</span></span></div>
              <div className="relative border-l-4 border-slate-200 ml-6 space-y-8 py-2">
                {timelineData.events.map((ev: any, idx: number) => (
                  <div key={idx} className="relative pl-8">
                    <div className="absolute -left-[22px] top-0 w-10 h-10 rounded-full flex items-center justify-center text-white border-4 border-white shadow-sm text-lg bg-red-600">{ev.icon}</div>
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl shadow-sm">
                      <h4 className="font-extrabold text-slate-900 text-md">{ev.title}</h4>
                      <p className="text-xs font-bold text-slate-600 mt-1">{ev.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}