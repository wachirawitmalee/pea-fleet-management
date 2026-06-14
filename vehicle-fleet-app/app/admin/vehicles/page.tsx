"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';

export default function AdminVehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // 🌟 States สำหรับหน้าต่างประวัติการซ่อม
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedVehicleHistory, setSelectedVehicleHistory] = useState<any>(null);
  const [vehicleMaintenanceList, setVehicleMaintenanceList] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const [formData, setFormData] = useState({
    vehicleId: '', plateNumber: '', brand: '', model: '', year: '', type: '', department: '',
    qrCodeData: '', vehicleStatus: 'AVAILABLE', currentMileage: '0', isBookable: true,
    taxExpireDate: '', nextCheckDate: '', nextCheckMileage: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/vehicles', { cache: 'no-store' });
      if (res.ok) setVehicles(await res.json());
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const openAddModal = () => {
    setIsEditing(false);
    setFormData({
      vehicleId: '', plateNumber: '', brand: '', model: '', year: '', type: '', department: '',
      qrCodeData: `PEA-CAR-${Date.now()}`, vehicleStatus: 'AVAILABLE', currentMileage: '0', 
      isBookable: true, taxExpireDate: '', nextCheckDate: '', nextCheckMileage: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (v: any) => {
    setIsEditing(true);
    setFormData({
      vehicleId: v.vehicleId, plateNumber: v.plateNumber, brand: v.brand, model: v.model || '', 
      year: v.year || '', type: v.type || '', department: v.department || '', qrCodeData: v.qrCodeData, 
      vehicleStatus: v.vehicleStatus, currentMileage: v.currentMileage?.toString() || '0', 
      isBookable: v.isBookable,
      taxExpireDate: v.taxExpireDate ? new Date(v.taxExpireDate).toISOString().split('T')[0] : '',
      nextCheckDate: v.nextCheckDate ? new Date(v.nextCheckDate).toISOString().split('T')[0] : '',
      nextCheckMileage: v.nextCheckMileage?.toString() || ''
    });
    setIsModalOpen(true);
  };

  const handleFormChange = (e: any) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch('/api/vehicles', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      if (res.ok) { Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', showConfirmButton: false, timer: 1500 }); setIsModalOpen(false); fetchData(); }
    } catch (err) { Swal.fire({ icon: 'error', title: 'การเชื่อมต่อล้มเหลว' }); }
  };

  const handleDelete = async (id: string) => {
    const confirm = await Swal.fire({ title: 'ต้องการลบรถคันนี้?', icon: 'warning', showCancelButton: true, confirmButtonText: 'ลบ', confirmButtonColor: '#e11d48' });
    if (confirm.isConfirmed) {
      const res = await fetch(`/api/vehicles?id=${id}`, { method: 'DELETE' });
      if (res.ok) { Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', showConfirmButton: false, timer: 1500 }); fetchData(); }
    }
  };

  const handlePrintQR = (qrData: string, plate: string) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qrData)}`;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Print QR Code - ${plate}</title></head>
          <body style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0; font-family:sans-serif;">
            <h1 style="font-size: 3rem; margin-bottom: 20px;">ทะเบียน: ${plate}</h1>
            <img src="${qrUrl}" style="width: 400px; height: 400px; border: 10px solid black; padding: 20px;" />
            <p style="font-size: 1.5rem; margin-top: 20px;">QR CODE สำหรับสแกนรับ-คืนรถ</p>
            <script>setTimeout(() => { window.print(); }, 1000);</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // 🌟 เปิดหน้าต่างประวัติการซ่อมของรถแต่ละคัน
  const openHistoryModal = async (v: any) => {
    setSelectedVehicleHistory(v);
    setIsHistoryModalOpen(true);
    setIsHistoryLoading(true);
    try {
      const res = await fetch('/api/maintenance', { cache: 'no-store' });
      if (res.ok) {
        const allTickets = await res.json();
        // คัดเอามาเฉพาะใบซ่อมของรถคันนี้
        setVehicleMaintenanceList(allTickets.filter((t: any) => t.vehicleId === v.vehicleId));
      }
    } catch (e) { console.error(e); } finally { setIsHistoryLoading(false); }
  };

  const filteredVehicles = vehicles.filter(v => 
    v.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
    v.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.model && v.model.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans relative">
      <nav className="bg-slate-900 text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3"><Link href="/admin" className="text-slate-400 hover:text-white font-bold text-sm">← กลับแดชบอร์ด</Link><span className="text-slate-600">|</span><h1 className="text-md font-bold text-emerald-400">จัดการข้อมูลรถยนต์</h1></div>
          <button onClick={openAddModal} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all">+ เพิ่มรถใหม่</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 mt-8 space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-300 shadow-sm">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-300 flex items-center gap-3">
            <span className="text-slate-400 pl-2">🔍</span>
            <input type="text" placeholder="ค้นหาด้วยทะเบียนรถ, ยี่ห้อ หรือรุ่น..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full text-slate-900 font-bold bg-transparent outline-none" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-300 shadow-sm overflow-hidden">
          {isLoading ? (<div className="p-12 text-center text-emerald-600 font-bold animate-pulse">กำลังโหลดข้อมูล...</div>) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 border-b border-slate-300">
                  <tr><th className="p-4 font-bold text-slate-800 text-sm">ทะเบียนรถ & QR</th><th className="p-4 font-bold text-slate-800 text-sm">ยี่ห้อ/รุ่น</th><th className="p-4 font-bold text-slate-800 text-sm">ไมล์ปัจจุบัน</th><th className="p-4 font-bold text-slate-800 text-sm">การตั้งค่า</th><th className="p-4 font-bold text-slate-800 text-sm text-center">จัดการ</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredVehicles.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-500 font-bold">ไม่พบรถยนต์ที่ค้นหา</td></tr>
                  ) : (
                    filteredVehicles.map((v) => (
                      <tr key={v.vehicleId} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <p className="font-extrabold text-slate-900 text-lg">{v.plateNumber}</p>
                          <button onClick={() => handlePrintQR(v.qrCodeData, v.plateNumber)} className="mt-2 text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 px-3 py-1.5 rounded-lg border border-slate-300 shadow-sm flex items-center gap-1">🖨️ พิมพ์ QR Code</button>
                        </td>
                        <td className="p-4 font-bold text-slate-800">{v.brand} {v.model}</td>
                        <td className="p-4 font-extrabold text-emerald-700">{v.currentMileage ? v.currentMileage.toLocaleString() : '0'} กม.</td>
                        <td className="p-4 space-y-1 text-xs">
                          {v.isBookable ? <div className="text-indigo-700 font-extrabold">🟢 เปิดให้จองล่วงหน้า</div> : <div className="text-orange-700 font-extrabold">🟠 สแกนใช้งานเท่านั้น (Walk-in)</div>}
                          {v.taxExpireDate && <div className="text-slate-600 font-bold">ภาษี: {new Date(v.taxExpireDate).toLocaleDateString('th-TH')}</div>}
                        </td>
                        <td className="p-4 flex gap-1.5 justify-center">
                          {/* 🌟 เพิ่มปุ่มดูประวัติซ่อมตรงนี้ */}
                          <button onClick={() => openHistoryModal(v)} className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-xl font-bold text-xs border border-amber-300 flex items-center gap-1">🛠️ ประวัติ</button>
                          <button onClick={() => openEditModal(v)} className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-xl font-bold text-xs border border-blue-300">แก้ไข</button>
                          <button onClick={() => handleDelete(v.vehicleId)} className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-xl font-bold text-xs border border-red-300">ลบ</button>
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

      {/* MODAL: เพิ่ม/แก้ไขรถยนต์ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] border border-slate-300 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-100">
              <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2"><span className="text-2xl">🚙</span> {isEditing ? 'แก้ไขรถยนต์' : 'เพิ่มรถยนต์ใหม่'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-white border border-slate-300 rounded-full flex items-center justify-center font-bold text-slate-600">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-white">
              <form id="vehicleForm" onSubmit={handleSave} className="space-y-6">
                
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-300">
                  <h4 className="text-sm font-extrabold text-slate-900 mb-3">ℹ️ ข้อมูลพื้นฐาน</h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div><label className="block text-xs font-extrabold text-slate-700 mb-1">ทะเบียนรถ *</label><input type="text" name="plateNumber" required value={formData.plateNumber} onChange={handleFormChange} className="w-full p-2.5 rounded-lg border border-slate-400 bg-white font-extrabold text-slate-900 outline-none focus:border-emerald-600" /></div>
                    <div><label className="block text-xs font-extrabold text-slate-700 mb-1">เลข QR Code *</label><input type="text" name="qrCodeData" required value={formData.qrCodeData} onChange={handleFormChange} className="w-full p-2.5 rounded-lg border border-emerald-400 bg-emerald-50 font-extrabold font-mono text-emerald-900 outline-none focus:border-emerald-600" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-extrabold text-slate-700 mb-1">ยี่ห้อ *</label><input type="text" name="brand" required value={formData.brand} onChange={handleFormChange} className="w-full p-2.5 rounded-lg border border-slate-400 bg-white font-extrabold text-slate-900 outline-none focus:border-emerald-600" /></div>
                    <div><label className="block text-xs font-extrabold text-slate-700 mb-1">รุ่น</label><input type="text" name="model" value={formData.model} onChange={handleFormChange} className="w-full p-2.5 rounded-lg border border-slate-400 bg-white font-extrabold text-slate-900 outline-none focus:border-emerald-600" /></div>
                  </div>
                </div>

                <div className="bg-indigo-50/50 p-5 rounded-2xl border-2 border-indigo-200 shadow-sm space-y-4">
                  <h4 className="text-sm font-extrabold text-indigo-900 mb-2">⚙️ การตั้งค่าระบบจองรถ</h4>
                  <label className="flex items-center gap-3 p-4 border border-indigo-300 rounded-xl bg-white cursor-pointer shadow-sm">
                    <input type="checkbox" name="isBookable" checked={formData.isBookable} onChange={handleFormChange} className="w-6 h-6 text-indigo-600 rounded focus:ring-indigo-500" />
                    <div><p className="font-extrabold text-indigo-900 text-lg">อนุญาตให้พนักงานจองรถคันนี้ล่วงหน้าได้</p></div>
                  </label>
                  <div><label className="block text-xs font-extrabold text-slate-700 mb-1">เลขไมล์ปัจจุบัน (กม.)</label><input type="number" name="currentMileage" value={formData.currentMileage} onChange={handleFormChange} className="w-full p-3 rounded-xl border border-slate-400 bg-white outline-none focus:border-indigo-600 font-extrabold text-indigo-900 text-lg" /></div>
                </div>

                <div className="bg-amber-50 p-5 rounded-2xl border border-amber-300 space-y-4">
                  <h4 className="text-sm font-extrabold text-amber-900 mb-2">🔔 ตั้งค่าแจ้งเตือน</h4>
                  <div><label className="block text-xs font-extrabold text-amber-800 mb-1">วันหมดอายุภาษี (พรบ.)</label><input type="date" name="taxExpireDate" value={formData.taxExpireDate} onChange={handleFormChange} className="w-full p-2.5 rounded-lg border border-amber-400 bg-white font-extrabold text-slate-900 outline-none focus:border-amber-600" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-extrabold text-amber-800 mb-1">วันที่ต้องเช็คระยะครั้งถัดไป</label><input type="date" name="nextCheckDate" value={formData.nextCheckDate} onChange={handleFormChange} className="w-full p-2.5 rounded-lg border border-amber-400 bg-white font-extrabold text-slate-900 outline-none focus:border-amber-600" /></div>
                    <div><label className="block text-xs font-extrabold text-amber-800 mb-1">ไมล์เช็คระยะ (กม.)</label><input type="number" name="nextCheckMileage" value={formData.nextCheckMileage} onChange={handleFormChange} className="w-full p-2.5 rounded-lg border border-amber-400 bg-white font-extrabold text-slate-900 outline-none focus:border-amber-600" placeholder="เช่น 10000" /></div>
                  </div>
                </div>

              </form>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-300 shadow-sm">ยกเลิก</button>
              <button type="submit" form="vehicleForm" className="px-8 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg">💾 บันทึกรถยนต์</button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 MODAL: ประวัติการซ่อมของรถยนต์คันที่เลือก */}
      {isHistoryModalOpen && selectedVehicleHistory && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] border border-slate-300 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-100">
              <div>
                <h3 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">🛠️ ประวัติการส่งซ่อม</h3>
                <p className="text-sm font-bold text-emerald-700 mt-1">รถยนต์ทะเบียน: {selectedVehicleHistory.plateNumber}</p>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="w-10 h-10 bg-white border border-slate-300 rounded-full font-bold text-slate-600 hover:bg-red-100 hover:text-red-600">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-white">
              {isHistoryLoading ? (
                <div className="text-center py-10 text-slate-500 font-bold animate-pulse">กำลังโหลดข้อมูลประวัติ...</div>
              ) : vehicleMaintenanceList.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-lg font-bold text-slate-500">รถคันนี้ยังไม่มีประวัติการส่งซ่อมบำรุงครับ</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {vehicleMaintenanceList.map((ticket) => (
                    <div key={ticket.ticketId} className="border-2 border-slate-200 rounded-2xl p-5 hover:border-emerald-300 transition-colors bg-slate-50">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-extrabold text-red-600 text-lg">{ticket.ticketNumber}</span>
                            <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${ticket.status === 'ปิดใบซ่อม' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'}`}>
                              {ticket.status}
                            </span>
                          </div>
                          <p className="font-bold text-slate-800 text-sm">อาการ/ปัญหา: <span className="text-red-700 font-extrabold">{ticket.issueDesc}</span></p>
                          <p className="text-xs font-bold text-slate-500 mt-1">วันที่แจ้ง: {new Date(ticket.requestDate).toLocaleDateString('th-TH')} | เลขไมล์: {ticket.mileage.toLocaleString()} กม.</p>
                        </div>
                        
                        <div className="w-full md:w-auto">
                          <button onClick={() => window.open(`/admin/maintenance/print/${ticket.ticketId}`, '_blank')} className="w-full md:w-auto px-6 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl font-bold text-sm transition-all border border-amber-300 shadow-sm flex items-center justify-center gap-2">
                            🖨️ พิมพ์เอกสารใบซ่อม
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-100 text-center">
              <button onClick={() => setIsHistoryModalOpen(false)} className="px-8 py-3 rounded-xl font-extrabold text-white bg-slate-800 hover:bg-slate-900 shadow-lg">ปิดหน้าต่าง</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}