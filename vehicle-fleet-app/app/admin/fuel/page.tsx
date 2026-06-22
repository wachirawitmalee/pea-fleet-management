"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { showLoading, showSuccess, showError } from '@/lib/alert';

export default function AdminFuelPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter States
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterVehicleId, setFilterVehicleId] = useState('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    id: '', date: '', vehicleId: '', mileage: '', 
    voucherVolume: '', voucherNumber: '', voucherDate: '', stationName: '',
    fuelType: 'ดีเซล (Diesel)', quantity: '', pricePerLiter: '', 
    totalAmount: '0.00', netAmount: '0.00', vatAmount: '0.00'
  });

  useEffect(() => {
    fetchData();
    fetchVehicles();
  }, []);

  // 🌟 ระบบคำนวณอัตโนมัติ (จำนวนเงิน, มูลค่าสินค้า, ภาษี 7%)
  useEffect(() => {
    if (formData.quantity && formData.pricePerLiter) {
      const q = parseFloat(formData.quantity);
      const p = parseFloat(formData.pricePerLiter);
      if (!isNaN(q) && !isNaN(p)) {
        const total = q * p;
        const net = total * 100 / 107;
        const vat = total - net;
        
        setFormData(prev => ({
          ...prev,
          totalAmount: total.toFixed(2),
          netAmount: net.toFixed(2),
          vatAmount: vat.toFixed(2)
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, totalAmount: '0.00', netAmount: '0.00', vatAmount: '0.00' }));
    }
  }, [formData.quantity, formData.pricePerLiter]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (filterStartDate) query.append('startDate', filterStartDate);
      if (filterEndDate) query.append('endDate', filterEndDate);
      if (filterVehicleId) query.append('vehicleId', filterVehicleId);

      const res = await fetch(`/api/fuel?${query.toString()}`);
      if (res.ok) setRecords(await res.json());
    } catch (e) {
      showError('เชื่อมต่อล้มเหลว', 'ไม่สามารถดึงข้อมูลได้');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await fetch('/api/vehicles');
      if (res.ok) setVehicles(await res.json());
    } catch (e) { console.error(e); }
  };

  const formatDateForInput = (isoString: string | null) => isoString ? new Date(isoString).toISOString().split('T')[0] : '';

  const openAddModal = () => {
    setIsEditMode(false);
    setFormData({
      id: '', date: new Date().toISOString().split('T')[0], vehicleId: '', mileage: '', 
      voucherVolume: '', voucherNumber: '', voucherDate: '', stationName: '',
      fuelType: 'ดีเซล (Diesel)', quantity: '', pricePerLiter: '', 
      totalAmount: '0.00', netAmount: '0.00', vatAmount: '0.00'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (rec: any) => {
    setIsEditMode(true);
    setFormData({
      id: rec.id, date: formatDateForInput(rec.date), vehicleId: rec.vehicleId, mileage: rec.mileage.toString(), 
      voucherVolume: rec.voucherVolume || '', voucherNumber: rec.voucherNumber || '', 
      voucherDate: formatDateForInput(rec.voucherDate), stationName: rec.stationName || '',
      fuelType: rec.fuelType, quantity: rec.quantity.toString(), pricePerLiter: rec.pricePerLiter.toString(), 
      totalAmount: rec.totalAmount.toFixed(2), netAmount: rec.netAmount.toFixed(2), vatAmount: rec.vatAmount.toFixed(2)
    });
    setIsModalOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.vehicleId || !formData.mileage || !formData.quantity || !formData.pricePerLiter) {
      showError('ข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบถ้วน');
      return;
    }

    showLoading('กำลังบันทึกข้อมูล...', 'กรุณารอสักครู่');
    const method = isEditMode ? 'PUT' : 'POST';
    try {
      const res = await fetch('/api/fuel', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        await showSuccess('บันทึกสำเร็จ!');
        setIsModalOpen(false);
        fetchData();
      } else {
        showError('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้');
      }
    } catch (error) {
      showError('เชื่อมต่อล้มเหลว', 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้');
    }
  };

  const handleDelete = async (id: string) => {
    const confirm = await Swal.fire({
      title: 'ยืนยันการลบ?', text: 'คุณต้องการลบประวัติการเติมน้ำมันนี้ใช่หรือไม่?', icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'ลบเลย', cancelButtonText: 'ยกเลิก',
      customClass: { popup: 'rounded-[2rem]' }
    });

    if (confirm.isConfirmed) {
      showLoading('กำลังลบข้อมูล...');
      try {
        const res = await fetch(`/api/fuel?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
          await showSuccess('ลบสำเร็จ');
          fetchData();
        } else {
          showError('ผิดพลาด', 'ไม่สามารถลบข้อมูลได้');
        }
      } catch (error) {
        showError('เชื่อมต่อล้มเหลว');
      }
    }
  };

  // 🌟 ฟังก์ชัน Export Excel
  const exportToExcel = () => {
    if (records.length === 0) {
      Swal.fire({ icon: 'info', title: 'ไม่มีข้อมูล', text: 'ไม่มีข้อมูลสำหรับดาวน์โหลดรายงาน' });
      return;
    }
    const exportData = records.map(r => ({
      'วันที่เติม': new Date(r.date).toLocaleDateString('th-TH'),
      'ทะเบียนรถ': r.vehicle.plateNumber,
      'เลขไมล์': r.mileage,
      'สถานที่เติม': r.stationName || '-',
      'เล่มที่': r.voucherVolume || '-',
      'เลขที่': r.voucherNumber || '-',
      'สั่งจ่าย ณ วันที่': r.voucherDate ? new Date(r.voucherDate).toLocaleDateString('th-TH') : '-',
      'ประเภทน้ำมัน': r.fuelType,
      'จำนวนลิตร': r.quantity,
      'ราคา/ลิตร': r.pricePerLiter,
      'มูลค่าสินค้า (ก่อนภาษี)': r.netAmount.toFixed(2),
      'ภาษี (VAT)': r.vatAmount.toFixed(2),
      'จำนวนเงินรวม': r.totalAmount.toFixed(2)
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'FuelRecords');
    XLSX.writeFile(workbook, `Fuel_Report_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans relative">
      <nav className="bg-slate-900 text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-slate-400 hover:text-white font-bold text-sm">← กลับแดชบอร์ด</Link>
            <span className="text-slate-600">|</span>
            <h1 className="text-md font-bold text-amber-400">ประวัติการเติมน้ำมัน</h1>
          </div>
          <button onClick={openAddModal} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all">+ บันทึกการเติมน้ำมัน</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 mt-8 space-y-6">
        
        {/* กล่องค้นหาและ Export */}
        <div className="bg-white p-6 rounded-3xl border border-slate-300 shadow-sm flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">ตั้งแต่วันที่</label>
              <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 bg-slate-50 font-bold outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">ถึงวันที่</label>
              <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 bg-slate-50 font-bold outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">ทะเบียนรถ</label>
              <select value={filterVehicleId} onChange={e => setFilterVehicleId(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 bg-slate-50 font-bold outline-none cursor-pointer">
                <option value="">-- รถทุกคัน --</option>
                {vehicles.map(v => <option key={v.vehicleId} value={v.vehicleId}>{v.plateNumber}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={fetchData} className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-xl shadow-md flex-1 md:flex-none">🔍 ค้นหา</button>
            <button onClick={exportToExcel} className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl shadow-md flex-1 md:flex-none flex items-center justify-center gap-2">📥 <span>Export Excel</span></button>
          </div>
        </div>

        {/* ตารางแสดงผล */}
        <div className="bg-white rounded-3xl border border-slate-300 shadow-sm overflow-hidden">
          {isLoading ? (<div className="p-12 text-center text-amber-600 font-bold animate-pulse">กำลังโหลดข้อมูล...</div>) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 border-b border-slate-300">
                  <tr>
                    <th className="p-4 font-bold text-slate-800 text-sm">วันที่เติม</th>
                    <th className="p-4 font-bold text-slate-800 text-sm">รถยนต์</th>
                    <th className="p-4 font-bold text-slate-800 text-sm">ใบสั่งจ่าย (เล่ม/เลข)</th>
                    <th className="p-4 font-bold text-slate-800 text-sm">ปริมาณ (ลิตร)</th>
                    <th className="p-4 font-bold text-slate-800 text-sm">รวมสุทธิ (บาท)</th>
                    <th className="p-4 font-bold text-slate-800 text-sm text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {records.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-500 font-bold">ไม่พบข้อมูล</td></tr>
                  ) : (
                    records.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-700">{new Date(r.date).toLocaleDateString('th-TH')}</td>
                        <td className="p-4">
                          <p className="font-extrabold text-slate-900">{r.vehicle.plateNumber}</p>
                          <p className="text-xs text-slate-500 font-bold">ไมล์: {r.mileage.toLocaleString()}</p>
                        </td>
                        <td className="p-4 font-bold text-slate-700">
                          {r.voucherVolume || r.voucherNumber ? `${r.voucherVolume || '-'} / ${r.voucherNumber || '-'}` : '-'}
                        </td>
                        <td className="p-4 font-extrabold text-slate-800">{r.quantity} ลิตร</td>
                        <td className="p-4 font-extrabold text-amber-600">{r.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="p-4 flex justify-center gap-2">
                          <button onClick={() => openEditModal(r)} className="px-3 py-1.5 bg-blue-100 text-blue-800 font-bold text-xs rounded-lg border border-blue-300">แก้ไข</button>
                          <button onClick={() => handleDelete(r.id)} className="px-3 py-1.5 bg-red-100 text-red-800 font-bold text-xs rounded-lg border border-red-300">ลบ</button>
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

      {/* Modal เพิ่ม/แก้ไข */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] border border-slate-300 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-100">
              <h3 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">⛽ {isEditMode ? 'แก้ไขประวัติเติมน้ำมัน' : 'บันทึกการเติมน้ำมัน'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-white border border-slate-300 rounded-full font-bold text-slate-600 hover:text-red-500">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="block text-xs font-extrabold text-slate-700 mb-1">วันที่เติม *</label><input type="date" name="date" required value={formData.date} onChange={handleChange} className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 font-bold outline-none" /></div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">รถยนต์ *</label>
                  <select name="vehicleId" required value={formData.vehicleId} onChange={handleChange} className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 font-bold outline-none cursor-pointer">
                    <option value="" disabled>เลือกรถยนต์</option>
                    {vehicles.map(v => <option key={v.vehicleId} value={v.vehicleId}>{v.plateNumber}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-extrabold text-slate-700 mb-1">เลขไมล์ปัจจุบัน *</label><input type="number" name="mileage" required value={formData.mileage} onChange={handleChange} placeholder="ระบุเลขไมล์" className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 font-bold outline-none" /></div>
              </div>

              <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200">
                <h4 className="font-extrabold text-amber-800 mb-4 text-sm">📋 ข้อมูลใบสั่งจ่ายน้ำมัน (ถ้ามี)</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div><label className="block text-xs font-extrabold text-amber-900 mb-1">เล่มที่</label><input type="text" name="voucherVolume" value={formData.voucherVolume} onChange={handleChange} className="w-full p-2.5 rounded-lg border border-amber-300 bg-white font-bold outline-none" /></div>
                  <div><label className="block text-xs font-extrabold text-amber-900 mb-1">เลขที่</label><input type="text" name="voucherNumber" value={formData.voucherNumber} onChange={handleChange} className="w-full p-2.5 rounded-lg border border-amber-300 bg-white font-bold outline-none" /></div>
                  <div><label className="block text-xs font-extrabold text-amber-900 mb-1">สั่งจ่าย ณ วันที่</label><input type="date" name="voucherDate" value={formData.voucherDate} onChange={handleChange} className="w-full p-2.5 rounded-lg border border-amber-300 bg-white font-bold outline-none" /></div>
                  <div><label className="block text-xs font-extrabold text-amber-900 mb-1">สถานที่เติมน้ำมัน</label><input type="text" name="stationName" value={formData.stationName} onChange={handleChange} className="w-full p-2.5 rounded-lg border border-amber-300 bg-white font-bold outline-none" placeholder="เช่น ปตท. สาขาระโนด" /></div>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-300">
                <h4 className="font-extrabold text-slate-800 mb-4 text-sm">⛽ รายการเติมน้ำมัน</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">ประเภทน้ำมัน *</label>
                    <select name="fuelType" value={formData.fuelType} onChange={handleChange} className="w-full p-3 rounded-xl border border-slate-300 bg-white font-bold outline-none">
                      <option value="ดีเซล (Diesel)">ดีเซล (Diesel)</option>
                      <option value="ดีเซล B7 (Diesel B7)">ดีเซล B7 (Diesel B7)</option>
                      <option value="เบนซิน 95 (Benzine 95)">เบนซิน 95 (Benzine 95)</option>
                      <option value="แก๊สโซฮอล์ 95 (Gasohol 95)">แก๊สโซฮอล์ 95 (Gasohol 95)</option>
                    </select>
                  </div>
                  <div><label className="block text-xs font-extrabold text-slate-700 mb-1">จำนวน (ลิตร) *</label><input type="number" step="0.01" name="quantity" required value={formData.quantity} onChange={handleChange} placeholder="0.00" className="w-full p-3 rounded-xl border border-slate-300 bg-white font-bold outline-none" /></div>
                  <div><label className="block text-xs font-extrabold text-slate-700 mb-1">ราคาต่อลิตร (บาท) *</label><input type="number" step="0.01" name="pricePerLiter" required value={formData.pricePerLiter} onChange={handleChange} placeholder="0.00" className="w-full p-3 rounded-xl border border-slate-300 bg-white font-bold outline-none" /></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <div><label className="block text-xs font-extrabold text-slate-500 mb-1">มูลค่าสินค้าก่อนภาษี</label><input type="text" disabled value={formData.netAmount} className="w-full p-3 rounded-lg bg-slate-100 text-slate-600 font-extrabold outline-none cursor-not-allowed text-right" /></div>
                  <div><label className="block text-xs font-extrabold text-slate-500 mb-1">ภาษีมูลค่าเพิ่ม (VAT 7%)</label><input type="text" disabled value={formData.vatAmount} className="w-full p-3 rounded-lg bg-slate-100 text-slate-600 font-extrabold outline-none cursor-not-allowed text-right" /></div>
                  <div><label className="block text-xs font-extrabold text-amber-600 mb-1">จำนวนเงินทั้งหมดสุทธิ</label><input type="text" disabled value={formData.totalAmount} className="w-full p-3 rounded-lg border-2 border-amber-400 bg-amber-50 text-amber-700 text-xl font-black outline-none cursor-not-allowed text-right" /></div>
                </div>
              </div>
            </form>

            <div className="p-4 border-t border-slate-200 bg-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-300 shadow-sm">ยกเลิก</button>
              <button onClick={handleSubmit} className="px-8 py-3 rounded-xl font-extrabold text-white bg-amber-600 hover:bg-amber-700 shadow-lg">💾 บันทึกข้อมูล</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}