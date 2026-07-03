"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { Scanner } from '@yudiel/react-qr-scanner';

// 🌟 1. Import Helper Functions มาใช้งาน
import { showLoading, showSuccess, showError } from '@/lib/alert';

export default function MyBookingsPage() {
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  const [scannedVehicle, setScannedVehicle] = useState<any>(null);
  const [vehicleBookings, setVehicleBookings] = useState<any[]>([]);
  const [activeWalkInLog, setActiveWalkInLog] = useState<any>(null);

  const handleScanQR = async (codeToSearch: string) => {
    if (!codeToSearch) {
      Swal.fire({ icon: 'warning', title: 'กรุณาระบุรหัส QR Code', confirmButtonColor: '#9333ea', customClass: { popup: 'rounded-[2rem]' } });
      return;
    }

    setLoading(true);
    setIsCameraOpen(false);

    // 🌟 2. เรียกใช้งาน Popup Loading หมุนๆ ทันทีที่กดปุ่ม
    showLoading('กำลังตรวจสอบข้อมูล...', 'ระบบกำลังค้นหาข้อมูลรถและคิวการใช้งานครับ');

    try {
      const resVehicles = await fetch('/api/vehicles');
      const vehicles = await resVehicles.json();
      const targetVehicle = vehicles.find((v: any) => v.qrCodeData === codeToSearch);

      if (!targetVehicle) {
        showError('ไม่พบรถยนต์', 'รหัส QR Code นี้ไม่ตรงกับรถในระบบ');
        setScannedVehicle(null); setVehicleBookings([]); setActiveWalkInLog(null);
        setLoading(false); return;
      }

      setScannedVehicle(targetVehicle);

      // ดึงคิวการจอง (สำหรับรถที่เปิดให้จอง)
      const resBookings = await fetch('/api/reservations');
      const allBookings = await resBookings.json();
      const activeBookings = allBookings.filter((b: any) => 
        b.vehicleId === targetVehicle.vehicleId && (b.reservationStatus === 'BOOKED' || b.reservationStatus === 'CHECKED_IN')
      );
      setVehicleBookings(activeBookings);

      // ดึง Log การวิ่งรถ (เพื่อหาคิว Walk-in ที่ยังไม่คืนรถ)
      const resLogs = await fetch('/api/check-in-out');
      const allLogs = await resLogs.json();
      const activeWalkIn = allLogs.find((l: any) => 
        l.vehicleId === targetVehicle.vehicleId && l.checkOutTime === null && l.reservationId === null
      );
      setActiveWalkInLog(activeWalkIn || null);

      // 🌟 3. ตรวจสอบเงื่อนไขการปิด Loading
      if (activeBookings.length === 0 && targetVehicle.isBookable) {
        // ถ้าเป็นรถจองล่วงหน้าแต่ไม่มีคิว ให้โชว์แจ้งเตือน (ตัวแจ้งเตือนจะทับ Loading ไปเลย)
        Swal.fire({ icon: 'info', title: 'ไม่มีคิวใช้งาน', text: 'รถคันนี้เปิดให้จองล่วงหน้า แต่ยังไม่มีคิวในขณะนี้ครับ', confirmButtonColor: '#10b981', customClass: { popup: 'rounded-[2rem]' } });
      } else {
        // ถ้าเจอข้อมูลสำเร็จ และพร้อมโชว์ ให้สั่งปิดหน้าต่าง Loading
        Swal.close();
      }

    } catch (e) {
      showError('ดึงข้อมูลไม่สำเร็จ', 'ไม่สามารถติดต่อฐานข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (b: any, type: 'IN' | 'OUT') => {
    const isWalkIn = !b; 
    const reservationId = b ? b.reservationId : null;
    const vId = isWalkIn ? scannedVehicle.vehicleId : b.vehicleId;
    
    const mileageOut = isWalkIn ? (activeWalkInLog ? activeWalkInLog.mileageOut : 0) : (b?.checkInOutLog ? b.checkInOutLog.mileageOut : 0);

    const { value: formValues } = await Swal.fire({
      title: `<span style="color: ${type === 'IN' ? '#059669' : '#e11d48'}; font-weight: 800; font-size: 1.5rem;">${type === 'IN' ? '🟢 รับรถ (Check-in)' : '🔴 คืนรถ (Check-out)'}</span>`,
      html: `
        <div class="text-left space-y-4 mt-4 font-sans" style="text-align: left;">
          
          ${isWalkIn && type === 'IN' ? `
            <div style="margin-bottom: 12px; background: #fffbeb; padding: 12px; border-radius: 14px; border: 1px solid #fde68a;">
              <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #b45309; margin-bottom: 6px;">รหัสพนักงาน (ผู้ขับขี่) <span style="color: red;">*</span></label>
              <input id="swal-empid" type="text" style="width: 100%; padding: 12px; border-radius: 12px; border: 1px solid #fcd34d; outline: none; background: #fff; font-size: 1.1rem; font-weight: 800; color: #92400e;" placeholder="ระบุรหัส 6-7 หลัก" />
            </div>
          ` : ''}

          ${type === 'OUT' ? `
            <div style="background: #eff6ff; padding: 12px; border-radius: 14px; border: 1px solid #bfdbfe; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span style="font-size: 0.85rem; font-weight: 700; color: #1e3a8a;">🔢 เลขไมล์ขาไป:</span>
              <span style="font-size: 1.2rem; font-weight: 800; color: #1e40af;">${mileageOut} กม.</span>
            </div>
          ` : ''}

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #475569; margin-bottom: 6px;">เลขไมล์ปัจจุบันบนหน้าปัดรถ <span style="color: red;">*</span></label>
            <input id="swal-mileage" type="number" style="width: 100%; padding: 12px; border-radius: 12px; border: 1px solid #cbd5e1; outline: none; background: #f8fafc; font-size: 1.1rem; font-weight: 700; color: #1e293b;" placeholder="กรอกตัวเลขไมล์รถ" 
              oninput="${type === 'OUT' ? `const dist = this.value - ${mileageOut}; document.getElementById('calc-dist').innerText = dist >= 0 ? dist + ' กม.' : '❌ เลขไมล์ผิดปกติ (ติดลบ)';` : ''}" />
          </div>

          ${type === 'OUT' ? `
            <div style="background: #ecfdf5; padding: 12px; border-radius: 14px; border: 1px solid #a7f3d0; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span style="font-size: 0.85rem; font-weight: 700; color: #064e3b;">📊 ระยะทางสุทธิทริปนี้:</span>
              <span id="calc-dist" style="font-size: 1.2rem; font-weight: 800; color: #047857;">0 กม.</span>
            </div>
          ` : ''}

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #475569; margin-bottom: 6px;">📸 ถ่ายรูปหน้าปัดรถ</label>
            <input id="swal-photo" type="file" accept="image/*" capture="environment" style="width: 100%; padding: 10px; border-radius: 12px; border: 1px solid #cbd5e1; background: #f8fafc; font-size: 0.85rem;" />
          </div>

          ${type === 'OUT' ? `
            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #475569; margin-bottom: 6px;">📝 หมายเหตุรายงานปัญหา</label>
              <textarea id="swal-remark" rows="2" style="width: 100%; padding: 12px; border-radius: 12px; border: 1px solid #cbd5e1; outline: none; background: #f8fafc; font-size: 0.9rem;" placeholder="รถมีรอยขูดขีด, แอร์ไม่เย็น..."></textarea>
            </div>
          ` : ''}
        </div>
      `,
      showCancelButton: true, confirmButtonText: '📦 บันทึกข้อมูลส่งระบบ', cancelButtonText: 'ยกเลิก',
      confirmButtonColor: type === 'IN' ? '#10b981' : '#f43f5e',
      customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl px-6 py-3 font-bold', cancelButton: 'rounded-xl px-6 py-3 font-bold' },
      
      preConfirm: async () => {
        const m = (document.getElementById('swal-mileage') as HTMLInputElement).value;
        const fileInput = (document.getElementById('swal-photo') as HTMLInputElement);
        const r = document.getElementById('swal-remark') ? (document.getElementById('swal-remark') as HTMLTextAreaElement).value : '';
        const empInput = document.getElementById('swal-empid') ? (document.getElementById('swal-empid') as HTMLInputElement).value : null;

        if (isWalkIn && type === 'IN' && !empInput) return Swal.showValidationMessage('⚠️ กรุณากรอกรหัสพนักงานผู้ขับขี่');
        if (!m) return Swal.showValidationMessage('⚠️ กรุณากรอกเลขไมล์ปัจจุบันก่อนครับ!');
        if (type === 'OUT' && parseInt(m, 10) < mileageOut) return Swal.showValidationMessage(`❌ ไมล์ขากลับ (${m}) น้อยกว่าขาไป (${mileageOut}) เป็นไปไม่ได้!`);

        let base64Photo = '';
        if (fileInput.files && fileInput.files[0]) {
          const file = fileInput.files[0];
          base64Photo = await new Promise<string>((resolve) => {
            const reader = new FileReader(); reader.onloadend = () => resolve(reader.result as string); reader.readAsDataURL(file);
          });
        }
        return { mileage: m, photoUrl: base64Photo, remark: r, employeeId: empInput };
      }
    });

    if (formValues) {
      showLoading('กำลังบันทึกข้อมูล...', 'กรุณารอสักครู่ ระบบกำลังอัปเดตข้อมูล');

      try {
        const res = await fetch('/api/check-in-out', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            reservationId, 
            vehicleId: vId, 
            employeeId: formValues.employeeId, 
            type, 
            mileage: formValues.mileage, 
            photoUrl: formValues.photoUrl, 
            remark: formValues.remark 
          })
        });

        if (res.ok) {
          await showSuccess('บันทึกสำเร็จ!');
          
          setScannedVehicle(null);
          setQrCode('');
          setVehicleBookings([]);
          setActiveWalkInLog(null);
          setIsCameraOpen(false);

        } else {
          const data = await res.json();
          showError('ข้อผิดพลาด', data.error || 'ไม่สามารถทำรายการได้');
        }
      } catch (error) {
        showError('ระบบขัดข้อง', 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      
      <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-purple-700 transition-colors group">
            <div className="p-2 bg-slate-100 rounded-full group-hover:bg-purple-100 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg></div><span className="font-semibold hidden sm:block">กลับหน้าหลัก</span>
          </Link>
          <div className="text-center"><h1 className="text-xl font-bold text-slate-800">สแกนรับ-คืนรถยนต์</h1><p className="text-xs text-purple-600 font-medium">สาขาระโนด</p></div><div className="w-[100px]"></div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 mt-8 relative z-10">
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-[2rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8 text-center">
          {isCameraOpen ? (
            <div className="mb-6 rounded-2xl overflow-hidden border-4 border-purple-500 shadow-lg relative max-w-sm mx-auto">
              <Scanner onScan={(r) => { if (r && r.length > 0) { const t = r[0].rawValue; setQrCode(t); handleScanQR(t); } }} onError={(e) => console.log(e?.message)} />
              <button onClick={() => setIsCameraOpen(false)} className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full shadow-md hover:bg-red-600">✕</button>
            </div>
          ) : (
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-6 shadow-inner"><svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg></div>
          )}
          <h2 className="text-2xl font-bold text-slate-800 mb-2">สแกน QR Code รถยนต์</h2><p className="text-slate-500 mb-8">เพื่อทำรายการ รับ-คืนรถ (ทั้งแบบจองและ Walk-in)</p>
          <div className="flex flex-col gap-4 justify-center">
            {!isCameraOpen && (<button onClick={() => setIsCameraOpen(true)} className="w-full bg-slate-800 hover:bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold shadow-md transition-all flex items-center justify-center gap-2">เปิดกล้องสแกน QR Code</button>)}
            <div className="flex items-center gap-4 my-2"><div className="h-px bg-slate-200 flex-1"></div><span className="text-sm text-slate-400 font-medium">หรือกรอกรหัสด้วยตัวเอง</span><div className="h-px bg-slate-200 flex-1"></div></div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <input type="text" placeholder="พิมพ์รหัส QR Code" className="px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 text-center font-bold outline-none w-full sm:w-64" value={qrCode} onChange={(e) => setQrCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleScanQR(qrCode)} />
              
              {/* 🌟 4. แก้ปุ่มกด เปลี่ยนสี เปลี่ยนข้อความให้ผู้ใช้รู้ว่ากำลังทำงาน */}
              <button onClick={() => handleScanQR(qrCode)} disabled={loading} className={`px-8 py-4 rounded-2xl font-bold shadow-md transition-all text-white ${loading ? 'bg-slate-400 cursor-wait' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg'}`}>
                {loading ? '⏳ กำลังค้นหา...' : 'ตรวจสอบ'}
              </button>
            </div>
          </div>
        </div>

        {scannedVehicle && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-[2rem] text-white shadow-xl flex items-center gap-6">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center border border-white/20"><span className="text-2xl">🚙</span></div>
              <div><p className="text-slate-300 font-medium text-sm mb-1">{scannedVehicle.brand}</p><h3 className="text-2xl font-bold tracking-wide">{scannedVehicle.plateNumber}</h3></div>
            </div>

            {scannedVehicle.isBookable && vehicleBookings.length > 0 && (
              <div className="bg-white/80 backdrop-blur-md p-6 rounded-[2rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><span className="w-2 h-6 bg-purple-600 rounded-full"></span> คิวการใช้งานตามใบจอง</h3>
                <div className="space-y-4">
                  {vehicleBookings.map((b) => (
                    <div key={b.reservationId} className="p-5 rounded-2xl border-2 border-slate-100 bg-slate-50/50">
                      <div className="flex justify-between items-start mb-4">
                        <div><p className="font-bold text-slate-800 text-lg">{b.employee.fullName}</p><p className="text-sm text-slate-500 mt-1">📍 {b.destination}</p></div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${b.reservationStatus === 'BOOKED' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>{b.reservationStatus === 'BOOKED' ? 'รอรับรถ' : 'กำลังใช้งาน'}</span>
                      </div>
                      <div className="pt-4 border-t border-slate-200 flex justify-end">
                        {b.reservationStatus === 'BOOKED' && (<button onClick={() => handleAction(b, 'IN')} className="w-full sm:w-auto bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold shadow-md">🔓 รับรถ (Check-in)</button>)}
                        {b.reservationStatus === 'CHECKED_IN' && (<button onClick={() => handleAction(b, 'OUT')} className="w-full sm:w-auto bg-rose-500 text-white px-6 py-3 rounded-xl font-bold shadow-md">🔒 คืนรถ (Check-out)</button>)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!scannedVehicle.isBookable && scannedVehicle.vehicleStatus !== 'MAINTENANCE' && (
              <div className="bg-white/80 backdrop-blur-md p-6 rounded-[2rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><span className="w-2 h-6 bg-orange-500 rounded-full"></span> ใช้งานแบบ Walk-in (ไม่ต้องจอง)</h3>
                
                {scannedVehicle.vehicleStatus === 'AVAILABLE' && (
                  <button onClick={() => handleAction(null, 'IN')} className="w-full bg-emerald-500 text-white px-6 py-5 rounded-2xl font-extrabold shadow-lg text-lg flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all">
                    <span className="text-2xl">🔓</span> สแกนรับรถออกไปใช้งาน
                  </button>
                )}

                {scannedVehicle.vehicleStatus === 'IN_USE' && activeWalkInLog && (
                  <div className="p-6 rounded-2xl border-2 border-orange-200 bg-orange-50 shadow-sm text-center">
                    <p className="font-extrabold text-orange-900 text-xl mb-1">{activeWalkInLog.employee.fullName}</p>
                    <p className="text-sm font-bold text-orange-600 mb-6">นำรถออกเมื่อ: {new Date(activeWalkInLog.checkInTime).toLocaleString('th-TH')} น.</p>
                    <button onClick={() => handleAction(null, 'OUT')} className="w-full bg-rose-600 text-white px-6 py-4 rounded-xl font-extrabold shadow-md hover:bg-rose-700 transition-all text-lg flex items-center justify-center gap-2">
                      <span className="text-2xl">🔒</span> สแกนคืนรถเข้าบริษัท
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}