"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';

// 🌟 1. Import Helper Functions มาใช้งาน
import { showLoading, showSuccess, showError } from '@/lib/alert';

export default function MaintenanceManagementPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTicket, setCurrentTicket] = useState<any>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [timelineData, setTimelineData] = useState<any>(null);

  // 🌟 เพิ่ม shopName ลงไป
  const [formData, setFormData] = useState({
    status: '', shopName: '', quoteDate: '', managerApproveDate: '', principleDate: '',
    prNo: '', prDate: '', poNo: '', poDate: '', instructionDate: '', partsReturnDate: '',
    entryDate: '', finishDate: '', docReceiveDate: '', sendFinanceDate: '', voucherDate: '',
    cost: '', result: '', adminNote: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/maintenance', { cache: 'no-store' });
      if (res.ok) setTickets(await res.json());
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  const formatDateForInput = (isoString: string | null) => isoString ? new Date(isoString).toISOString().split('T')[0] : '';

  const openEditModal = (ticket: any) => {
    setCurrentTicket(ticket);
    setFormData({
      status: ticket.status || 'รอตรวจสอบ', 
      shopName: ticket.shop?.shopName || '', // 🌟 ดึงชื่อร้านมาแสดงในช่องพิมพ์
      quoteDate: formatDateForInput(ticket.quoteDate), managerApproveDate: formatDateForInput(ticket.managerApproveDate), 
      principleDate: formatDateForInput(ticket.principleDate), prNo: ticket.prNo || '', prDate: formatDateForInput(ticket.prDate), 
      poNo: ticket.poNo || '', poDate: formatDateForInput(ticket.poDate), instructionDate: formatDateForInput(ticket.instructionDate), 
      partsReturnDate: formatDateForInput(ticket.partsReturnDate), entryDate: formatDateForInput(ticket.entryDate), 
      finishDate: formatDateForInput(ticket.finishDate), docReceiveDate: formatDateForInput(ticket.docReceiveDate), 
      sendFinanceDate: formatDateForInput(ticket.sendFinanceDate), voucherDate: formatDateForInput(ticket.voucherDate), 
      cost: ticket.cost ? ticket.cost.toString() : '', result: ticket.result || '', adminNote: ticket.adminNote || ''
    });
    setIsModalOpen(true);
  };

  const handleFormChange = (e: any) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // 🌟 2. เรียก Loading Spinner ทันทีที่กดปุ่มบันทึก
    showLoading('กำลังบันทึกข้อมูล...', 'กรุณารอสักครู่ ระบบกำลังอัปเดตใบแจ้งซ่อม');

    try {
      const res = await fetch('/api/maintenance', { 
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ ticketId: currentTicket.ticketId, vehicleId: currentTicket.vehicleId, ...formData }) 
      });
      if (res.ok) { 
        await showSuccess('บันทึกเรียบร้อย'); 
        setIsModalOpen(false); 
        fetchData(); 
      } else {
        showError('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้');
      }
    } catch (error) { 
      showError('เชื่อมต่อล้มเหลว', 'เกิดปัญหาในการเชื่อมต่อเซิร์ฟเวอร์'); 
    }
  };

  const handleDelete = async (id: string, vehicleId: string) => {
    // ใช้ Swal แบบเดิมเพื่อถามยืนยันก่อนลบ
    const confirm = await Swal.fire({ title: 'ลบใบแจ้งซ่อม?', icon: 'warning', showCancelButton: true, confirmButtonText: 'ลบเลย', confirmButtonColor: '#ef4444' });
    if (confirm.isConfirmed) {
      
      // 🌟 3. เรียก Loading Spinner ระหว่างรอลบข้อมูล
      showLoading('กำลังลบข้อมูล...', 'กรุณารอสักครู่');

      try {
        const res = await fetch(`/api/maintenance?id=${id}&vId=${vehicleId}`, { method: 'DELETE' });
        if (res.ok) { 
          await showSuccess('ลบสำเร็จ'); 
          fetchData(); 
        } else {
          showError('เกิดข้อผิดพลาด', 'ไม่สามารถลบข้อมูลได้');
        }
      } catch (error) {
        showError('เชื่อมต่อล้มเหลว', 'เกิดปัญหาในการเชื่อมต่อเซิร์ฟเวอร์');
      }
    }
  };

  const handleOpenTimeline = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/maintenance/timeline?id=${ticketId}`);
      if (res.ok) { setTimelineData(await res.json()); setIsTimelineOpen(true); }
    } catch (error) { console.error(error); }
  };

  const filteredTickets = tickets.filter(t => {
    const searchMatch = t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) || t.vehicle.plateNumber.toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter === 'ALL') return searchMatch;
    if (statusFilter === 'PENDING') return searchMatch && !['ปิดใบซ่อม', 'ยกเลิกการซ่อม'].includes(t.status);
    if (statusFilter === 'COMPLETED') return searchMatch && t.status === 'ปิดใบซ่อม';
    if (statusFilter === 'CANCELLED') return searchMatch && t.status === 'ยกเลิกการซ่อม';
    return searchMatch;
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans relative">
      <nav className="bg-slate-900 text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3"><Link href="/admin" className="text-slate-400 hover:text-white font-bold text-sm">← กลับแดชบอร์ด</Link><span className="text-slate-600">|</span><h1 className="text-md font-bold text-red-400">จัดการใบแจ้งซ่อม</h1></div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-300 flex items-center gap-3"><span className="text-slate-400 pl-2">🔍</span><input type="text" placeholder="ค้นหาด้วยเลขที่ใบซ่อม, ทะเบียนรถ..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full text-slate-900 font-bold bg-transparent outline-none" /></div>
          <div className="flex flex-wrap gap-2 pt-1">
            {[{ code: 'ALL', label: '🗂️ ทั้งหมด' }, { code: 'PENDING', label: '⏳ ดำเนินการ' }, { code: 'COMPLETED', label: '🏁 ปิดงาน' }, { code: 'CANCELLED', label: '❌ ยกเลิก' }].map(tab => (
              <button key={tab.code} onClick={() => setStatusFilter(tab.code)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${statusFilter === tab.code ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'}`}>{tab.label}</button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (<div className="p-12 text-center text-red-500 font-bold animate-pulse">กำลังโหลดข้อมูล...</div>) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
  <tr className="bg-slate-100 border-b border-slate-200 text-left">
    <th className="p-4 font-bold text-slate-800 text-sm">เลขที่ใบซ่อม</th>
    <th className="p-4 font-bold text-slate-800 text-sm">รถยนต์</th>
    <th className="p-4 font-bold text-slate-800 text-sm">รายการซ่อม</th> {/* 🟢 เพิ่มหัวข้อนี้เข้าไป */}
    <th className="p-4 font-bold text-slate-800 text-sm">ผู้แจ้ง</th>
    <th className="p-4 font-bold text-slate-800 text-sm">สถานะ</th>
    <th className="p-4 font-bold text-slate-800 text-sm text-center">จัดการ</th>
  </tr>
</thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredTickets.map(t => (
                    <tr key={t.ticketId} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-mono font-extrabold text-red-700">{t.ticketNumber}</td>
                      <td className="p-4"><p className="font-extrabold text-slate-900">{t.vehicle.plateNumber}</p><p className="text-xs text-slate-500 font-bold">{t.vehicle.brand}</p></td>
                      <td className="p-4"><p className="text-sm text-slate-700">{t.issueDesc}</p></td> {/* 🟢 ข้อมูลรายการซ่อม (อยู่ช่องที่ 3) */}
                      <td className="p-4 font-bold text-slate-800">{t.employee.fullName}</td> {/* 🟢 ข้อมูลผู้แจ้ง (อยู่ช่องที่ 4) */}
                      <td className="p-4"> {/* 🟢 ข้อมูลป้ายสถานะ (อยู่ช่องที่ 5) */}
  <span className={`px-3 py-1 rounded-full text-xs font-bold border ...โค้ดสีเดิมของคุณ...`}>
    {t.status}
  </span>
</td>
<td className="p-4 flex gap-1.5 justify-center"> {/* 🟢 ปุ่มจัดการต่างๆ (อยู่ช่องที่ 6) */}
  {/* ... ปุ่มจัดการ, ไทม์ไลน์, ลบ ... */}
</td>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal แก้ไข */}
      {isModalOpen && currentTicket && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] border border-slate-300 shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-100">
              <div><h3 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2"><span className="text-2xl">🛠️</span> จัดการใบแจ้งซ่อม: <span className="text-red-600">{currentTicket.ticketNumber}</span></h3></div>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-white border border-slate-300 rounded-full flex items-center justify-center font-bold text-slate-600 hover:bg-red-100 hover:text-red-600">✕</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-white">
              <form id="editForm" onSubmit={handleSave} className="space-y-8">
                
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-300">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div><span className="text-slate-600 font-bold">ผู้แจ้ง:</span> <span className="font-extrabold text-slate-900 ml-1">{currentTicket.employee.fullName}</span></div>
                    <div><span className="text-slate-600 font-bold">รถยนต์:</span> <span className="font-extrabold text-slate-900 ml-1">{currentTicket.vehicle.plateNumber}</span></div>
                    <div><span className="text-slate-600 font-bold">เลขไมล์:</span> <span className="font-extrabold text-slate-900 ml-1">{currentTicket.mileage.toLocaleString()} กม.</span></div>
                    <div className="col-span-full"><span className="text-slate-600 font-bold block mb-1">ปัญหาที่พบ:</span> <div className="bg-white p-3 border border-red-200 rounded-xl font-bold text-red-700">{currentTicket.issueDesc}</div></div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 mb-2 uppercase">🎯 สถานะปัจจุบันของใบงาน</h4>
                  <select name="status" value={formData.status} onChange={handleFormChange} className="w-full p-4 rounded-xl border-2 border-red-300 bg-red-50 text-red-800 font-extrabold text-lg outline-none cursor-pointer focus:border-red-600 focus:bg-white">
                    <option value="รอตรวจสอบ">⏳ รอตรวจสอบ</option><option value="รอผู้จัดการอนุมัติ">⏳ รอผู้จัดการอนุมัติ</option><option value="ขออนุมัติหลักการ">⏳ ขออนุมัติหลักการ</option><option value="นำรถเข้าร้าน / อู่">🔧 นำรถเข้าร้าน / อู่</option><option value="อยู่ระหว่างซ่อม">🔧 อยู่ระหว่างซ่อม</option><option value="เบิกจ่าย">💸 เบิกจ่าย</option><option value="ปิดใบซ่อม">🏁 ปิดใบซ่อม (ปลดล็อกรถยนต์)</option><option value="ยกเลิกการซ่อม">❌ ยกเลิกการซ่อม (ปลดล็อกรถยนต์)</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-200 shadow-sm space-y-4">
                      <h4 className="text-sm font-extrabold text-amber-800 mb-2 uppercase">📋 ขั้นตอนการอนุมัติ</h4>
                      <div><label className="block text-xs font-extrabold text-slate-700 mb-1">วันที่ใบเสนอราคา</label><input type="date" name="quoteDate" value={formData.quoteDate} onChange={handleFormChange} className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-extrabold text-slate-900 outline-none focus:border-amber-500" /></div>
                      <div><label className="block text-xs font-extrabold text-slate-700 mb-1">วันที่ ผจก. อนุมัติ</label><input type="date" name="managerApproveDate" value={formData.managerApproveDate} onChange={handleFormChange} className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-extrabold text-slate-900 outline-none focus:border-amber-500" /></div>
                      <div><label className="block text-xs font-extrabold text-slate-700 mb-1">วันที่อนุมัติหลักการ</label><input type="date" name="principleDate" value={formData.principleDate} onChange={handleFormChange} className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-extrabold text-slate-900 outline-none focus:border-amber-500" /></div>
                    </div>
                    
                    <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-200 shadow-sm space-y-4">
                      <h4 className="text-sm font-extrabold text-blue-800 mb-2 uppercase">🛒 จัดซื้อ / สั่งจ้าง</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-xs font-extrabold text-slate-700 mb-1">เลขที่ PR</label><input type="text" name="prNo" value={formData.prNo} onChange={handleFormChange} className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-extrabold text-slate-900 outline-none focus:border-blue-500" placeholder="-" /></div>
                        <div><label className="block text-xs font-extrabold text-slate-700 mb-1">วันที่ PR</label><input type="date" name="prDate" value={formData.prDate} onChange={handleFormChange} className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-extrabold text-slate-900 outline-none focus:border-blue-500" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-xs font-extrabold text-slate-700 mb-1">เลขที่ PO</label><input type="text" name="poNo" value={formData.poNo} onChange={handleFormChange} className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-extrabold text-slate-900 outline-none focus:border-blue-500" placeholder="-" /></div>
                        <div><label className="block text-xs font-extrabold text-slate-700 mb-1">วันที่ PO / จ้าง</label><input type="date" name="poDate" value={formData.poDate} onChange={handleFormChange} className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-extrabold text-slate-900 outline-none focus:border-blue-500" /></div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-purple-50/50 p-5 rounded-2xl border border-purple-200 shadow-sm space-y-4">
                      <h4 className="text-sm font-extrabold text-purple-800 mb-2 uppercase">🛠️ การดำเนินงานซ่อม</h4>
                      <div>
                        {/* 🌟 เปลี่ยนช่อง Shop เป็นแบบให้พิมพ์เอง */}
                        <label className="block text-xs font-extrabold text-slate-700 mb-1">ชื่อร้านค้า / อู่ซ่อม (พิมพ์ชื่อได้เลย)</label>
                        <input type="text" name="shopName" value={formData.shopName} onChange={handleFormChange} placeholder="พิมพ์ชื่อร้านซ่อม..." className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-extrabold text-slate-900 outline-none focus:border-purple-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-xs font-extrabold text-slate-700 mb-1">ผกส.สั่งนำรถเข้า</label><input type="date" name="instructionDate" value={formData.instructionDate} onChange={handleFormChange} className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-extrabold text-slate-900 outline-none focus:border-purple-500" /></div>
                        <div><label className="block text-xs font-extrabold text-slate-700 mb-1">วันเข้านำรถซ่อม</label><input type="date" name="entryDate" value={formData.entryDate} onChange={handleFormChange} className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-extrabold text-slate-900 outline-none focus:border-purple-500" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-xs font-extrabold text-slate-700 mb-1">วันซ่อมเสร็จ</label><input type="date" name="finishDate" value={formData.finishDate} onChange={handleFormChange} className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-extrabold text-slate-900 outline-none focus:border-purple-500" /></div>
                        <div><label className="block text-xs font-extrabold text-slate-700 mb-1">วันที่ส่งคืนพัสดุ</label><input type="date" name="partsReturnDate" value={formData.partsReturnDate} onChange={handleFormChange} className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-extrabold text-slate-900 outline-none focus:border-purple-500" /></div>
                      </div>
                    </div>

                    <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-200 shadow-sm space-y-4">
                      <h4 className="text-sm font-extrabold text-emerald-800 mb-2 uppercase">💸 ปิดงาน / เบิกจ่าย</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-xs font-extrabold text-slate-700 mb-1">ผกส. รับเอกสาร</label><input type="date" name="docReceiveDate" value={formData.docReceiveDate} onChange={handleFormChange} className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-extrabold text-slate-900 outline-none focus:border-emerald-500" /></div>
                        <div><label className="block text-xs font-extrabold text-slate-700 mb-1">ส่งให้ ผสน.</label><input type="date" name="sendFinanceDate" value={formData.sendFinanceDate} onChange={handleFormChange} className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-extrabold text-slate-900 outline-none focus:border-emerald-500" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-xs font-extrabold text-slate-700 mb-1">ออกใบสำคัญจ่าย</label><input type="date" name="voucherDate" value={formData.voucherDate} onChange={handleFormChange} className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-extrabold text-slate-900 outline-none focus:border-emerald-500" /></div>
                        <div><label className="block text-xs font-extrabold text-emerald-700 mb-1">ค่าใช้จ่ายรวม (บาท)</label><input type="number" name="cost" value={formData.cost} onChange={handleFormChange} className="w-full p-2.5 rounded-lg border-2 border-emerald-400 bg-emerald-50 font-extrabold text-emerald-800 outline-none focus:border-emerald-600" placeholder="0.00" /></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <div><label className="block text-xs font-extrabold text-slate-800 mb-1">📝 สรุปผลการซ่อม (สิ่งที่ดำเนินการไป)</label><textarea name="result" rows={2} value={formData.result} onChange={handleFormChange} className="w-full p-3 rounded-xl border border-slate-300 bg-white font-extrabold text-slate-900 outline-none focus:border-slate-500 shadow-sm" placeholder="ระบุผลการซ่อม..." /></div>
                  <div><label className="block text-xs font-extrabold text-red-600 mb-1">🔒 หมายเหตุภายใน (แสดงเฉพาะแอดมิน)</label><textarea name="adminNote" rows={2} value={formData.adminNote} onChange={handleFormChange} className="w-full p-3 rounded-xl border border-red-300 bg-red-50 font-extrabold text-red-900 outline-none focus:border-red-600 shadow-sm" placeholder="-" /></div>
                </div>

              </form>
            </div>
            
           {/* 🌟 Footer Buttons 🌟 */}
            <div className="p-4 border-t border-slate-200 bg-slate-100 flex justify-end gap-3 flex-wrap">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-200 shadow-sm">ยกเลิก</button>
              
              {/* ปุ่มพิมพ์ใบแจ้งซ่อม (ใบเปิดงานปกติ) */}
              <button type="button" onClick={() => window.open(`/admin/maintenance/print/${currentTicket.ticketId}`, '_blank')} className="px-6 py-3 rounded-xl font-bold text-amber-900 bg-amber-200 border border-amber-400 hover:bg-amber-300 shadow-sm flex items-center gap-2">
                🖨️ พิมพ์ใบแจ้งซ่อม
              </button>

              {/* 🌟 ปุ่มพิมพ์ใบปิดงานซ่อม (จะโชว์เฉพาะเมื่อสถานะเป็น "ปิดใบซ่อม") 🌟 */}
              {formData.status === 'ปิดใบซ่อม' && (
                <button type="button" onClick={() => window.open(`/admin/maintenance/print-close/${currentTicket.ticketId}`, '_blank')} className="px-6 py-3 rounded-xl font-bold text-emerald-900 bg-emerald-200 border border-emerald-400 hover:bg-emerald-300 shadow-sm flex items-center gap-2 animate-pulse">
                  ✅ พิมพ์ใบปิดงานซ่อม
                </button>
              )}

              <button type="submit" form="editForm" className="px-8 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg">💾 บันทึกการเปลี่ยนแปลง</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ไทม์ไลน์ */}
      {isTimelineOpen && timelineData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2rem] border border-slate-300 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-100">
              <div><h3 className="text-xl font-extrabold text-slate-900">ไทม์ไลน์งานซ่อม</h3></div>
              <button onClick={() => setIsTimelineOpen(false)} className="w-10 h-10 bg-white border border-slate-300 rounded-full font-bold shadow-sm text-slate-600">✕</button>
            </div>
            <div className="p-6 overflow-y-auto bg-white flex-1">
              <div className="text-center mb-6"><span className="inline-block px-4 py-2 bg-slate-100 text-slate-800 font-extrabold rounded-full text-sm border border-slate-300">เวลาที่ใช้ไปทั้งหมด: <span className="text-red-600">{timelineData.totalDays} วัน</span></span></div>
              <div className="relative border-l-4 border-slate-200 ml-6 space-y-8 py-2">
                {timelineData.events.map((ev: any, idx: number) => (
                  <div key={idx} className="relative pl-8">
                    <div className={`absolute -left-[22px] top-0 w-10 h-10 rounded-full flex items-center justify-center text-white border-4 border-white shadow-sm text-lg ${ev.status === 'done' ? 'bg-emerald-600 border-emerald-200' : 'bg-amber-500 border-amber-200'}`}>{ev.icon}</div>
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