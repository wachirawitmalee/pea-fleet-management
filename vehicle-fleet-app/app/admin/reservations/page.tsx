"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState(''); // 🌟 เพิ่ม State การค้นหา
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/reservations', { cache: 'no-store' });
      if (res.ok) {
        setReservations(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const openPhotoModal = (resv: any) => {
    setSelectedLog(resv);
  };

  // 🌟 ฟังก์ชันกรองการจองตามคำค้นหา
  const filteredReservations = reservations.filter(r => 
    r.employee.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.vehicle.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.destination.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans relative">
      <nav className="bg-slate-900 text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-3">
          <Link href="/admin" className="text-slate-400 hover:text-white font-bold text-sm">← กลับแดชบอร์ด</Link>
          <span className="text-slate-600">|</span>
          <h1 className="text-md font-bold text-amber-400">ตรวจสอบการจองและบันทึกการใช้งาน (Log)</h1>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 mt-8 space-y-6">
        
        {/* 🌟 แถบค้นหาข้อมูล */}
        <div className="bg-white p-6 rounded-3xl border border-slate-300 shadow-sm">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-300 flex items-center gap-3">
            <span className="text-slate-400 pl-2">🔍</span>
            <input 
              type="text" 
              placeholder="ค้นหาด้วยชื่อพนักงาน, ทะเบียนรถ, หรือสถานที่ปลายทาง..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full text-slate-900 font-bold bg-transparent outline-none" 
            />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-300 shadow-sm overflow-hidden">
          {isLoading ? (<div className="p-12 text-center text-amber-600 font-bold animate-pulse">กำลังโหลดข้อมูล...</div>) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 border-b border-slate-300">
                  <tr>
                    <th className="p-4 font-bold text-slate-800 text-sm">พนักงานผู้จอง</th>
                    <th className="p-4 font-bold text-slate-800 text-sm">รถยนต์</th>
                    <th className="p-4 font-bold text-slate-800 text-sm">ช่วงเวลาที่จอง</th>
                    <th className="p-4 font-bold text-slate-800 text-sm">สถานะ</th>
                    <th className="p-4 font-bold text-slate-800 text-sm text-center">หลักฐานการใช้งาน (Log)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredReservations.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-500 font-bold">ไม่พบข้อมูลที่ค้นหา</td></tr>
                  ) : (
                    filteredReservations.map((r) => (
                      <tr key={r.reservationId} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4"><p className="font-extrabold text-slate-900">{r.employee.fullName}</p><p className="text-xs font-bold text-slate-600">{r.destination}</p></td>
                        <td className="p-4 font-extrabold text-slate-800">{r.vehicle.plateNumber}</td>
                        <td className="p-4 text-sm font-bold text-slate-700">
                          {new Date(r.startDate).toLocaleDateString('th-TH')} <br/>
                          <span className="text-xs text-slate-500">{r.startTime} - {r.endTime} น.</span>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border 
                            ${r.reservationStatus === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 
                              r.reservationStatus === 'BOOKED' ? 'bg-blue-100 text-blue-800 border-blue-300' : 
                              'bg-amber-100 text-amber-800 border-amber-300'}`}>
                            {r.reservationStatus}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {r.logs || r.checkInOutLog ? (
                            <button onClick={() => openPhotoModal(r)} className="px-4 py-2 bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md hover:bg-slate-900 transition-all flex items-center gap-2 mx-auto">
                              📸 ดูบันทึกและรูปถ่าย
                            </button>
                          ) : (
                            <span className="text-xs font-bold text-slate-400">ยังไม่มีการรับรถ</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* MODAL ดูรูปถ่ายหน้าปัด */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] border border-slate-300 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-100">
              <h3 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">📸 บันทึกการรับ-คืนรถ</h3>
              <button onClick={() => setSelectedLog(null)} className="w-10 h-10 bg-white border border-slate-300 rounded-full font-bold text-slate-600 hover:bg-red-100 hover:text-red-600">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-white">
              <div className="bg-slate-100 p-5 rounded-2xl border border-slate-300 mb-6 text-center">
                <p className="font-extrabold text-slate-900 text-lg">{selectedLog.employee.fullName} | รถ: {selectedLog.vehicle.plateNumber}</p>
                {(selectedLog.logs?.mileageIn || selectedLog.checkInOutLog?.mileageIn) ? (
                  <p className="mt-2 text-emerald-700 font-extrabold text-xl">
                    ✅ ระยะทางที่วิ่งไปทั้งหมด: <span className="bg-emerald-200 px-3 py-1 rounded-lg">{(selectedLog.logs?.mileageIn || selectedLog.checkInOutLog?.mileageIn) - (selectedLog.logs?.mileageOut || selectedLog.checkInOutLog?.mileageOut)} กม.</span>
                  </p>
                ) : (
                  <p className="mt-2 text-amber-600 font-extrabold">⏳ กำลังใช้งานอยู่ (ยังไม่คืนรถ)</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border-2 border-blue-200 bg-blue-50/30 rounded-2xl p-5">
                  <h4 className="text-center font-extrabold text-blue-800 mb-4 bg-blue-100 py-2 rounded-xl">🟢 ขาไป (รับรถ Check-in)</h4>
                  <div className="space-y-3">
                    <p className="font-bold text-slate-700">เลขไมล์: <span className="text-lg font-extrabold text-blue-900">{selectedLog.logs?.mileageOut || selectedLog.checkInOutLog?.mileageOut} กม.</span></p>
                    <p className="font-bold text-slate-700">เวลา: <span className="font-extrabold text-slate-900">{new Date(selectedLog.logs?.checkInTime || selectedLog.checkInOutLog?.checkInTime).toLocaleString('th-TH')} น.</span></p>
                    <div className="mt-4">
                      <p className="font-bold text-slate-700 mb-2">รูปถ่ายหน้าปัด / หลักฐาน:</p>
                      {(selectedLog.logs?.photoOutUrl || selectedLog.checkInOutLog?.photoOutUrl) ? (
                        <img src={selectedLog.logs?.photoOutUrl || selectedLog.checkInOutLog?.photoOutUrl} alt="Check-in Photo" className="w-full rounded-xl border border-blue-300 shadow-sm" />
                      ) : (
                        <div className="w-full h-32 bg-slate-200 rounded-xl flex items-center justify-center font-bold text-slate-400">ไม่มีการแนบรูปภาพ</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-2 border-rose-200 bg-rose-50/30 rounded-2xl p-5">
                  <h4 className="text-center font-extrabold text-rose-800 mb-4 bg-rose-100 py-2 rounded-xl">🔴 ขากลับ (คืนรถ Check-out)</h4>
                  <div className="space-y-3">
                    <p className="font-bold text-slate-700">เลขไมล์: <span className="text-lg font-extrabold text-rose-900">{(selectedLog.logs?.mileageIn || selectedLog.checkInOutLog?.mileageIn) ? `${selectedLog.logs?.mileageIn || selectedLog.checkInOutLog?.mileageIn} กม.` : '-'}</span></p>
                    <p className="font-bold text-slate-700">เวลา: <span className="font-extrabold text-slate-900">{(selectedLog.logs?.checkOutTime || selectedLog.checkInOutLog?.checkOutTime) ? new Date(selectedLog.logs?.checkOutTime || selectedLog.checkInOutLog?.checkOutTime).toLocaleString('th-TH') + ' น.' : '-'}</span></p>
                    <div className="mt-4">
                      <p className="font-bold text-slate-700 mb-2">รูปถ่ายหน้าปัด / หลักฐาน:</p>
                      {(selectedLog.logs?.photoInUrl || selectedLog.checkInOutLog?.photoInUrl) ? (
                        <img src={selectedLog.logs?.photoInUrl || selectedLog.checkInOutLog?.photoInUrl} alt="Check-out Photo" className="w-full rounded-xl border border-rose-300 shadow-sm" />
                      ) : (
                        <div className="w-full h-32 bg-slate-200 rounded-xl flex items-center justify-center font-bold text-slate-400">ไม่มีการแนบรูปภาพ</div>
                      )}
                    </div>
                    {(selectedLog.logs?.remark || selectedLog.checkInOutLog?.remark) && (
                      <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-xl">
                        <p className="text-xs font-extrabold text-red-800 mb-1">📝 หมายเหตุตอนคืนรถ:</p>
                        <p className="text-sm font-bold text-red-900">{selectedLog.logs?.remark || selectedLog.checkInOutLog?.remark}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* 🌟 Footer ของ Modal จัดการการจอง 🌟 */}
            <div className="p-4 border-t border-slate-200 bg-slate-100 flex justify-center gap-4">
              {/* ปุ่มพิมพ์เอกสารบันทึกการเดินทาง */}
              <button onClick={() => window.open(`/admin/reservations/print-log/${selectedLog.reservationId}`, '_blank')} className="px-8 py-3 rounded-xl font-extrabold text-blue-900 bg-blue-200 hover:bg-blue-300 border border-blue-400 shadow-md flex items-center gap-2 transition-all">
                🖨️ พิมพ์บันทึกรับ-คืนรถ
              </button>
              
              <button onClick={() => setSelectedLog(null)} className="px-8 py-3 rounded-xl font-extrabold text-white bg-slate-800 hover:bg-slate-900 shadow-lg transition-all">
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}