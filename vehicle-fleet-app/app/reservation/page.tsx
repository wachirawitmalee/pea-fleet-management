"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';

// 🌟 1. Import Helper Functions มาใช้งาน
import { showLoading, showSuccess, showError } from '@/lib/alert';

export default function ReservationPage() {
  const router = useRouter();

  const [employees, setEmployees] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [allReservations, setAllReservations] = useState<any[]>([]);
  
  const [employeeId, setEmployeeId] = useState('');
  const [fullName, setFullName] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState('');

  const [startHour, setStartHour] = useState('08');
  const [startMin, setStartMin] = useState('00');
  const [endHour, setEndHour] = useState('16');
  const [endMin, setEndMin] = useState('00');

  const startTime = `${startHour}:${startMin}`;
  const endTime = `${endHour}:${endMin}`;

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      // 🌟 [แก้ไข] เพิ่ม cache: 'no-store' เพื่อบังคับดึงข้อมูลใหม่เสมอ
      const [empRes, vehRes, resvRes] = await Promise.all([ 
        fetch('/api/employees', { cache: 'no-store' }), 
        fetch('/api/vehicles', { cache: 'no-store' }), 
        fetch('/api/reservations', { cache: 'no-store' }) 
      ]);
      if (empRes.ok) setEmployees(await empRes.json()); 
      if (vehRes.ok) setVehicles(await vehRes.json()); 
      if (resvRes.ok) setAllReservations(await resvRes.json());
    } catch (e) { console.error(e); }
  };

  // 🌟 [แก้ไข] ลอจิกการค้นหาพนักงานที่รองรับ 6-7 หลัก และตรวจสอบสถานะแบบยืดหยุ่น
  useEffect(() => {
    // ทำงานเมื่อพิมพ์รหัสตั้งแต่ 6 หลักขึ้นไป (รองรับสูงสุด 7 หลักตาม maxLength)
    if (employeeId.length >= 6) {
      const found = employees.find(e => e.employeeId === employeeId);
      
      if (found) {
        // ถ้าระบุชัดเจนว่า INACTIVE ให้บล็อก
        if (found.status === 'INACTIVE') {
          setFullName('');
          // 🌟 2. ใช้ Helper Function แสดง Error
          showError('รหัสพนักงานถูกระงับ', 'พนักงานรหัสนี้พ้นสภาพการทำงานหรือย้ายสังกัดแล้ว ไม่สามารถจองรถได้ครับ');
        } else {
          // ถ้าเป็น ACTIVE หรือข้อมูลเก่าที่ยังไม่มี status ให้ดึงชื่อมาแสดงปกติ
          setFullName(found.fullName);
        }
      } else {
        setFullName('');
      }
    } else { 
      setFullName(''); 
    }
  }, [employeeId, employees]);

  const isVehicleAvailable = (vId: string) => {
    const targetVehicle = vehicles.find(v => v.vehicleId === vId);
    if (targetVehicle && targetVehicle.vehicleStatus === 'MAINTENANCE') return false;
    if (!startDate || !startTime || !endDate || !endTime) return true;

    const newStart = new Date(`${startDate}T${startTime}`);
    const newEnd = new Date(`${endDate}T${endTime}`);

    const isOverlapping = allReservations.some(res => {
      if (res.vehicleId !== vId || res.reservationStatus === 'COMPLETED' || res.reservationStatus === 'CANCELLED') return false;
      const extStart = new Date(`${res.startDate.split('T')[0]}T${res.startTime || '00:00'}`);
      const extEnd = new Date(`${res.endDate.split('T')[0]}T${res.endTime || '23:59'}`);
      return (newStart < extEnd && newEnd > extStart);
    });

    return !isOverlapping;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !fullName || !vehicleId || !startDate || !startTime || !endDate || !endTime || !destination) {
      // 🌟 3. ใช้ Helper Function
      showError('ข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลให้ครบถ้วน'); 
      return;
    }

    const bookingStartDateTime = new Date(`${startDate}T${startTime}`);
    const now = new Date();
    const cancelThreshold = new Date(bookingStartDateTime.getTime() + 60 * 60 * 1000); 

    if (now > cancelThreshold) {
      showError('เวลาจองไม่ถูกต้อง', 'คุณกำลังจองคิวย้อนหลังเกิน 1 ชั่วโมง (ระบบจะลบทิ้งอัตโนมัติ) กรุณาเปลี่ยนเวลาครับ'); 
      return;
    }
    if (!isVehicleAvailable(vehicleId)) {
      showError('ไม่สามารถจองได้', 'รถยนต์คันนี้ถูกจองไปแล้วในช่วงเวลาดังกล่าว'); 
      return;
    }

    // 🌟 4. เรียก Loading ก่อนยิง API
    showLoading('กำลังบันทึกการจอง...', 'กรุณารอสักครู่ ระบบกำลังจองคิวรถให้ท่าน');

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, vehicleId, startDate, startTime, endDate, endTime, destination, purpose })
      });
      
      if (res.ok) {
        // 🌟 5. แจ้งเตือนสำเร็จและพากลับหน้าตาราง
        await showSuccess('จองคิวรถสำเร็จ!', 'กำลังพาท่านไปยังหน้าตารางการใช้งาน...');
        router.push('/schedule');
      } else {
        const data = await res.json();
        showError('เกิดข้อผิดพลาด', data.error || 'ไม่สามารถบันทึกข้อมูลได้');
      }
    } catch (e) {
      showError('การเชื่อมต่อล้มเหลว', 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้');
    }
  };

  const hourOptions = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minuteOptions = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
  const isTimeFilled = startDate && startTime && endDate && endTime;

  // กรองเอามาเฉพาะรถที่แอดมินตั้งให้จองได้ (isBookable === true)
  const bookableVehicles = vehicles.filter(v => v.isBookable);

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-purple-700 transition-colors group"><div className="p-2 bg-slate-100 rounded-full group-hover:bg-purple-100 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg></div><span className="font-semibold hidden sm:block">กลับหน้าหลัก</span></Link>
          <div className="text-center"><h1 className="text-xl font-bold text-slate-800">ฟอร์มจองรถยนต์</h1><p className="text-xs text-purple-600 font-medium">สาขาระโนด</p></div><div className="w-[100px]"></div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 mt-8 relative z-10">
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><span className="text-xl">👤</span> ข้อมูลผู้จอง</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">รหัสพนักงาน <span className="text-red-500">*</span></label>
                  {/* 🌟 จำกัดความยาวที่ maxLength 7 หลัก และดักจับให้พิมพ์ได้เฉพาะตัวเลข */}
                  <input type="text" maxLength={7} value={employeeId} onChange={(e) => setEmployeeId(e.target.value.replace(/[^0-9]/g, ''))} className="w-full p-3 rounded-xl border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-purple-500 font-mono font-bold text-slate-950 shadow-sm" placeholder="ระบุรหัส 6-7 หลัก" />
                </div>
                <div><label className="block text-xs font-bold text-slate-600 mb-1">ชื่อ-นามสกุล</label><input type="text" disabled value={fullName} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-800 outline-none font-bold cursor-not-allowed" placeholder="รอข้อมูล..." /></div>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><span className="text-xl">⏰</span> วันและเวลาที่ต้องการใช้รถ</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-600 mb-1">วันที่เริ่มรับรถ <span className="text-red-500">*</span></label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-purple-500" /></div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">เวลาเริ่ม (ระบบ 24 ชม.) <span className="text-red-500">*</span></label>
                  <div className="flex items-center gap-2">
                    <select value={startHour} onChange={(e) => setStartHour(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 text-center outline-none focus:ring-2 focus:ring-purple-500">{hourOptions.map(h => <option key={h} value={h}>{h}</option>)}</select><span className="font-extrabold text-slate-700">:</span>
                    <select value={startMin} onChange={(e) => setStartMin(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 text-center outline-none focus:ring-2 focus:ring-purple-500">{minuteOptions.map(m => <option key={m} value={m}>{m}</option>)}</select><span className="text-xs font-bold text-slate-500 ml-1">น.</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-600 mb-1">วันที่คืนรถ <span className="text-red-500">*</span></label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-purple-500" /></div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">เวลาคืน (ระบบ 24 ชม.) <span className="text-red-500">*</span></label>
                  <div className="flex items-center gap-2">
                    <select value={endHour} onChange={(e) => setEndHour(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 text-center outline-none focus:ring-2 focus:ring-purple-500">{hourOptions.map(h => <option key={h} value={h}>{h}</option>)}</select><span className="font-extrabold text-slate-700">:</span>
                    <select value={endMin} onChange={(e) => setEndMin(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 text-center outline-none focus:ring-2 focus:ring-purple-500">{minuteOptions.map(m => <option key={m} value={m}>{m}</option>)}</select><span className="text-xs font-bold text-slate-500 ml-1">น.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-end mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><span className="text-xl">🚙</span> เลือกรถยนต์</h3>
                {!isTimeFilled && <span className="text-xs font-bold text-amber-600 bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200">ระบุเวลาให้ครบ เพื่อดูรถที่ว่าง</span>}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {bookableVehicles.length === 0 ? (
                  <div className="col-span-2 text-center p-4 bg-slate-100 rounded-xl text-slate-500 font-bold border border-slate-200">ยังไม่มีรถยนต์ที่เปิดให้จองในขณะนี้</div>
                ) : (
                  bookableVehicles.map((v) => {
                    const available = isVehicleAvailable(v.vehicleId);
                    const isMaintenance = v.vehicleStatus === 'MAINTENANCE';

                    return (
                      <label key={v.vehicleId} className={`relative flex items-center p-4 border-2 rounded-2xl transition-all duration-200 ${!available || isMaintenance ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed' : vehicleId === v.vehicleId ? 'border-purple-600 bg-purple-50 shadow-md cursor-pointer' : 'border-slate-300 hover:border-purple-400 bg-white cursor-pointer'}`}>
                        <input type="radio" name="vehicle" value={v.vehicleId} disabled={!available || isMaintenance} checked={vehicleId === v.vehicleId} onChange={() => setVehicleId(v.vehicleId)} className="hidden" />
                        <div className="flex flex-col flex-1 min-w-0 pr-2">
                          <span className="font-extrabold text-slate-900 text-lg truncate">{v.plateNumber}</span>
                          <span className="text-xs text-slate-600 font-bold truncate">{v.brand}</span>
                        </div>
                        <div className="ml-auto flex-shrink-0">
                          {isMaintenance ? (<span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-lg border border-red-200 whitespace-nowrap flex items-center gap-1">🛠️ ส่งซ่อม</span>) : available ? (<span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 whitespace-nowrap flex items-center gap-1">🟢 พร้อมใช้งาน</span>) : (<span className="px-2.5 py-1 bg-slate-200 text-slate-600 text-xs font-bold rounded-lg border border-slate-300 whitespace-nowrap flex items-center gap-1">❌ ติดจอง</span>)}
                        </div>
                      </label>
                    )
                  })
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><span className="text-xl">📍</span> รายละเอียดการเดินทาง</h3>
              <div><label className="block text-xs font-bold text-slate-600 mb-1">สถานที่ปลายทาง <span className="text-red-500">*</span></label><input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-purple-500" placeholder="ระบุสถานที่" /></div>
              <div><label className="block text-xs font-bold text-slate-600 mb-1">วัตถุประสงค์ (ถ้ามี)</label><input type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-purple-500" placeholder="เช่น ติดตั้งมิเตอร์ใหม่" /></div>
            </div>

            <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl mt-6 text-lg">ยืนยันการจองรถ</button>
          </form>
        </div>
      </main>
    </div>
  );
}