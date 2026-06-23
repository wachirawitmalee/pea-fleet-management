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

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'ALL'>(25);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // State สำหรับดูรายละเอียด
  const [selectedViewRecord, setSelectedViewRecord] = useState<any>(null);

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

  // รีเซ็ตหน้ากลับไปหน้าที่ 1 เสมอเวลาข้อมูลเปลี่ยนหรือเปลี่ยนจำนวนรายการต่อหน้า
  useEffect(() => {
    setCurrentPage(1);
  }, [records, itemsPerPage]);

  // ระบบคำนวณอัตโนมัติ (จำนวนเงิน, มูลค่าสินค้า, ภาษี 7%)
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

  const openViewModal = (rec: any) => {
    setSelectedViewRecord(rec);
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

  // คำนวณสรุปยอดทั้งหมด (Summary)
  const totalLiters = records.reduce((sum, r) => sum + r.quantity, 0);
  const totalCost = records.reduce((sum, r) => sum + r.totalAmount, 0);

  // คำนวณข้อมูลสำหรับ Pagination
  const getPaginatedRecords = () => {
    if (itemsPerPage === 'ALL') return records;
    const start = (currentPage - 1) * (itemsPerPage as number);
    const end = start + (itemsPerPage as number);
    return records.slice(start, end);
  };
  
  const paginatedRecords = getPaginatedRecords();
  const totalPages = itemsPerPage === 'ALL' ? 1 : Math.ceil(records.length / (itemsPerPage as number));

  // ฟังก์ชันสั่ง Print
  const handlePrintPDF = () => {
    if (records.length === 0) {
      Swal.fire({ icon: 'info', title: 'ไม่มีข้อมูล', text: 'ไม่มีข้อมูลสำหรับพิมพ์รายงาน' });
      return;
    }

    Swal.fire({
      icon: 'info',
      title: 'คำแนะนำก่อนสั่งพิมพ์',
      html: `
        <div class="text-left font-bold text-slate-700 text-sm mt-2">
          <p>เพื่อความสวยงามและซ่อนวันที่/ลิงก์ด้านบน-ล่าง กรุณาตั้งค่าเบราว์เซอร์ดังนี้:</p>
          <ul class="list-disc pl-5 mt-2 space-y-1 text-slate-600">
            <li>เลือก <b>Layout: แนวนอน (Landscape)</b></li>
            <li>ตั้งค่า <b>Paper size: A4</b></li>
            <li><span style="color:red">นำติ๊กถูกออก</span> ที่ช่อง <b>Headers and footers</b></li>
          </ul>
        </div>
      `,
      confirmButtonText: 'เข้าใจแล้ว, พิมพ์เอกสาร',
      confirmButtonColor: '#0891b2',
      customClass: { popup: 'rounded-[2rem]' }
    }).then((result) => {
      if (result.isConfirmed) {
        setTimeout(() => {
          window.print();
        }, 600);
      }
    });
  };

  return (
    <>
      {/* ========================================= */}
      {/* 🛠️ CSS สำหรับฝังฟอนต์และปรับโหมด Print PDF */}
      {/* ========================================= */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
        
        @font-face {
          font-family: 'THSarabunNew';
          src: url('https://cdn.jsdelivr.net/gh/thaifonts/THSarabunNew/fonts/THSarabunNew.ttf') format('truetype');
        }

        /* ซ่อนโหมดปริ้นต์เวลาอยู่หน้าเว็บปกติ */
        @media screen {
          .print-only { display: none !important; }
        }

        /* ตั้งค่าตอนปริ้นต์แบบไหลได้หลายหน้า */
        @media print {
          @page {
            size: A4 landscape;
            margin: 15mm 20mm; 
          }
          
          /* ปลดล็อกพวก overflow ให้หน้ากระดาษไหลลงไปได้เรื่อยๆ */
          html, body, main, div {
            height: auto !important;
            overflow: visible !important;
          }

          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-print { display: none !important; }
          
          .print-only {
            display: block !important;
            font-family: 'THSarabunNew', 'TH SarabunPSK', 'Sarabun', sans-serif !important;
            font-size: 16px !important; /* เทียบเท่า 12pt ใน Word */
            line-height: 1.45 !important;
            color: black !important;
            width: 100% !important;
            position: static !important;
          }

          /* ตารางปริ้นต์ */
          .print-table {
            width: 100%;
            border-collapse: collapse;
            page-break-inside: auto; /* อนุญาตให้ตารางข้ามหน้าได้ */
          }
          .print-table tr {
            page-break-inside: avoid; /* ป้องกันแถวตารางขาดครึ่ง */
            page-break-after: auto;
          }
          .print-table thead {
            display: table-header-group; /* นำหัวตารางไปโชว์ทุกหน้าใหม่เสมอ */
          }
          .print-table tfoot {
            display: table-footer-group; /* นำสรุปยอดไปไว้ท้ายสุดเสมอ */
          }
          .print-table th, .print-table td {
            border: 1px solid black !important;
            padding: 6px 8px !important;
          }
          
          .page-break-avoid {
            page-break-inside: avoid;
          }
        }
      `}} />

      {/* ============================== */}
      {/* 🖥️ โหมดแสดงผลหน้าจอเว็บ (Screen) */}
      {/* ============================== */}
      <div className="no-print min-h-screen bg-slate-50 pb-12 font-sans relative">
        <nav className="bg-slate-900 text-white sticky top-0 z-40 shadow-md">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-slate-400 hover:text-white font-bold text-sm">← กลับแดชบอร์ด</Link>
              <span className="text-slate-600">|</span>
              <h1 className="text-md font-bold text-cyan-400">ประวัติการเติมน้ำมัน</h1>
            </div>
            <button onClick={openAddModal} className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all">+ บันทึกการเติมน้ำมัน</button>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 mt-8 space-y-6 relative z-10">
          
          {/* กล่องค้นหาและ Export */}
          <div className="bg-white p-6 rounded-3xl border border-slate-300 shadow-sm flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ตั้งแต่วันที่</label>
                <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 font-bold outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ถึงวันที่</label>
                <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 font-bold outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ทะเบียนรถ</label>
                <select value={filterVehicleId} onChange={e => setFilterVehicleId(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 font-bold outline-none cursor-pointer focus:border-cyan-500">
                  <option value="">-- รถทุกคัน --</option>
                  {vehicles.map(v => <option key={v.vehicleId} value={v.vehicleId}>{v.plateNumber}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button onClick={fetchData} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-md flex-1 md:flex-none">🔍 ค้นหา</button>
              <button onClick={exportToExcel} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md flex-1 md:flex-none flex items-center justify-center gap-2">📥 <span>Excel</span></button>
              <button onClick={handlePrintPDF} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md flex-1 md:flex-none flex items-center justify-center gap-2">🖨️ <span>PDF</span></button>
            </div>
          </div>

          {/* การ์ดสรุปยอด (Summary Cards) */}
          {!isLoading && records.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 border-l-4 border-l-blue-500">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold">📋</div>
                <div><p className="text-xs font-bold text-slate-500 uppercase">จำนวนบิลที่เติมน้ำมัน</p><p className="text-2xl font-black text-slate-800">{records.length} <span className="text-sm font-bold text-slate-500">ครั้ง</span></p></div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 border-l-4 border-l-cyan-500">
                <div className="w-12 h-12 bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center text-xl font-bold">⛽</div>
                <div><p className="text-xs font-bold text-slate-500 uppercase">ปริมาณน้ำมันรวม</p><p className="text-2xl font-black text-slate-800">{totalLiters.toFixed(2)} <span className="text-sm font-bold text-slate-500">ลิตร</span></p></div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 border-l-4 border-l-amber-500">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-xl font-bold">💰</div>
                <div><p className="text-xs font-bold text-slate-500 uppercase">รวมค่าใช้จ่ายสุทธิ</p><p className="text-2xl font-black text-amber-600">{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-sm font-bold text-slate-500">บาท</span></p></div>
              </div>
            </div>
          )}

          {/* ตารางแสดงผลหน้าจอ */}
          <div className="bg-white rounded-3xl border border-slate-300 shadow-sm overflow-hidden flex flex-col">
            {isLoading ? (<div className="p-12 text-center text-cyan-600 font-bold animate-pulse">กำลังโหลดข้อมูล...</div>) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 border-b border-slate-300">
                      <tr>
                        <th className="p-4 font-bold text-slate-800 text-sm">วันที่เติม</th>
                        <th className="p-4 font-bold text-slate-800 text-sm">รถยนต์</th>
                        <th className="p-4 font-bold text-slate-800 text-sm">ประเภทน้ำมัน</th>
                        <th className="p-4 font-bold text-slate-800 text-sm text-right">ปริมาณ (ลิตร)</th>
                        <th className="p-4 font-bold text-slate-800 text-sm text-right">รวมสุทธิ (บาท)</th>
                        <th className="p-4 font-bold text-slate-800 text-sm text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {paginatedRecords.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center text-slate-500 font-bold">ไม่พบข้อมูล</td></tr>
                      ) : (
                        paginatedRecords.map(r => (
                          <tr key={r.id} className="hover:bg-cyan-50/50 transition-colors">
                            <td className="p-4 font-bold text-slate-800">{new Date(r.date).toLocaleDateString('th-TH')}</td>
                            <td className="p-4">
                              <p className="font-extrabold text-slate-900">{r.vehicle.plateNumber}</p>
                              <p className="text-xs text-slate-500 font-bold">ไมล์: {r.mileage.toLocaleString()}</p>
                            </td>
                            <td className="p-4 font-bold text-slate-800">{r.fuelType}</td>
                            <td className="p-4 font-extrabold text-slate-800 text-right">{r.quantity.toFixed(2)}</td>
                            <td className="p-4 font-extrabold text-amber-600 text-right">{r.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="p-4 flex justify-center gap-2">
                              <button onClick={() => openViewModal(r)} className="px-3 py-1.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 hover:bg-slate-200">🔍 ดูรายละเอียด</button>
                              <button onClick={() => openEditModal(r)} className="px-3 py-1.5 bg-blue-100 text-blue-800 font-bold text-xs rounded-lg border border-blue-300 hover:bg-blue-200">แก้ไข</button>
                              <button onClick={() => handleDelete(r.id)} className="px-3 py-1.5 bg-red-100 text-red-800 font-bold text-xs rounded-lg border border-red-300 hover:bg-red-200">ลบ</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-t border-slate-200 bg-slate-50 gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-600">แสดงรายการ:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                      className="p-1.5 rounded-lg border border-slate-300 font-bold text-slate-800 text-sm outline-none cursor-pointer bg-white"
                    >
                      <option value={25}>25</option>
                      <option value={30}>30</option>
                      <option value={35}>35</option>
                      <option value={40}>40</option>
                      <option value="ALL">ทั้งหมด</option>
                    </select>
                  </div>

                  {itemsPerPage !== 'ALL' && totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold text-sm disabled:opacity-50 hover:bg-slate-100"
                      >
                        ก่อนหน้า
                      </button>
                      <span className="text-sm font-bold text-slate-700 bg-slate-200 px-3 py-1.5 rounded-lg">
                        หน้า {currentPage} จาก {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold text-sm disabled:opacity-50 hover:bg-slate-100"
                      >
                        ถัดไป
                      </button>
                    </div>
                  )}
                </div>
              </>
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
                  <div><label className="block text-xs font-extrabold text-slate-800 mb-1">วันที่เติม *</label><input type="date" name="date" required value={formData.date} onChange={handleChange} className="w-full p-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" /></div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 mb-1">รถยนต์ *</label>
                    <select name="vehicleId" required value={formData.vehicleId} onChange={handleChange} className="w-full p-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold outline-none cursor-pointer focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100">
                      <option value="" disabled>เลือกรถยนต์</option>
                      {vehicles.map(v => <option key={v.vehicleId} value={v.vehicleId}>{v.plateNumber}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-xs font-extrabold text-slate-800 mb-1">เลขไมล์ปัจจุบัน *</label><input type="number" name="mileage" required value={formData.mileage} onChange={handleChange} placeholder="ระบุเลขไมล์" className="w-full p-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" /></div>
                </div>

                <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200">
                  <h4 className="font-extrabold text-amber-900 mb-4 text-sm">📋 ข้อมูลใบสั่งจ่ายน้ำมัน (ถ้ามี)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div><label className="block text-xs font-extrabold text-amber-900 mb-1">เล่มที่</label><input type="text" name="voucherVolume" value={formData.voucherVolume} onChange={handleChange} className="w-full p-2.5 rounded-lg border border-amber-300 bg-white text-slate-900 font-bold outline-none focus:border-amber-500" /></div>
                    <div><label className="block text-xs font-extrabold text-amber-900 mb-1">เลขที่</label><input type="text" name="voucherNumber" value={formData.voucherNumber} onChange={handleChange} className="w-full p-2.5 rounded-lg border border-amber-300 bg-white text-slate-900 font-bold outline-none focus:border-amber-500" /></div>
                    <div><label className="block text-xs font-extrabold text-amber-900 mb-1">สั่งจ่าย ณ วันที่</label><input type="date" name="voucherDate" value={formData.voucherDate} onChange={handleChange} className="w-full p-2.5 rounded-lg border border-amber-300 bg-white text-slate-900 font-bold outline-none focus:border-amber-500" /></div>
                    <div><label className="block text-xs font-extrabold text-amber-900 mb-1">สถานที่เติมน้ำมัน</label><input type="text" name="stationName" value={formData.stationName} onChange={handleChange} className="w-full p-2.5 rounded-lg border border-amber-300 bg-white text-slate-900 font-bold outline-none focus:border-amber-500" placeholder="เช่น ปตท. สาขาระโนด" /></div>
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-300">
                  <h4 className="font-extrabold text-slate-900 mb-4 text-sm">⛽ รายการเติมน้ำมัน</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-800 mb-1">ประเภทน้ำมัน *</label>
                      <select name="fuelType" value={formData.fuelType} onChange={handleChange} className="w-full p-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold outline-none focus:border-cyan-500">
                        <option value="ดีเซล (Diesel)">ดีเซล (Diesel)</option>
                        <option value="ดีเซล B7 (Diesel B7)">ดีเซล B7 (Diesel B7)</option>
                        <option value="เบนซิน 95 (Benzine 95)">เบนซิน 95 (Benzine 95)</option>
                        <option value="แก๊สโซฮอล์ 95 (Gasohol 95)">แก๊สโซฮอล์ 95 (Gasohol 95)</option>
                      </select>
                    </div>
                    <div><label className="block text-xs font-extrabold text-slate-800 mb-1">จำนวน (ลิตร) *</label><input type="number" step="0.01" name="quantity" required value={formData.quantity} onChange={handleChange} placeholder="0.00" className="w-full p-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold outline-none focus:border-cyan-500" /></div>
                    <div><label className="block text-xs font-extrabold text-slate-800 mb-1">ราคาต่อลิตร (บาท) *</label><input type="number" step="0.01" name="pricePerLiter" required value={formData.pricePerLiter} onChange={handleChange} placeholder="0.00" className="w-full p-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold outline-none focus:border-cyan-500" /></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <div><label className="block text-xs font-extrabold text-slate-500 mb-1">มูลค่าสินค้าก่อนภาษี</label><input type="text" disabled value={formData.netAmount} className="w-full p-3 rounded-lg bg-slate-100 text-slate-700 font-extrabold outline-none cursor-not-allowed text-right" /></div>
                    <div><label className="block text-xs font-extrabold text-slate-500 mb-1">ภาษีมูลค่าเพิ่ม (VAT 7%)</label><input type="text" disabled value={formData.vatAmount} className="w-full p-3 rounded-lg bg-slate-100 text-slate-700 font-extrabold outline-none cursor-not-allowed text-right" /></div>
                    <div><label className="block text-xs font-extrabold text-amber-600 mb-1">จำนวนเงินทั้งหมดสุทธิ</label><input type="text" disabled value={formData.totalAmount} className="w-full p-3 rounded-lg border-2 border-amber-400 bg-amber-50 text-amber-800 text-xl font-black outline-none cursor-not-allowed text-right" /></div>
                  </div>
                </div>
              </form>

              <div className="p-4 border-t border-slate-200 bg-slate-100 flex justify-end gap-3">
                <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-300 shadow-sm hover:bg-slate-200">ยกเลิก</button>
                <button onClick={handleSubmit} className="px-8 py-3 rounded-xl font-extrabold text-white bg-cyan-600 hover:bg-cyan-700 shadow-lg">💾 บันทึกข้อมูล</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal ดูรายละเอียด (View) */}
        {selectedViewRecord && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[2rem] border border-slate-300 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-100">
                <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">📄 รายละเอียดการเติมน้ำมัน</h3>
                <button onClick={() => setSelectedViewRecord(null)} className="w-10 h-10 bg-white border border-slate-300 rounded-full font-bold text-slate-600 hover:text-red-500">✕</button>
              </div>
              
              <div className="overflow-y-auto flex-1 p-6 space-y-6">
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  <div><p className="text-slate-500 font-bold mb-1">วันที่เติมน้ำมัน</p><p className="font-extrabold text-slate-900 text-base">{new Date(selectedViewRecord.date).toLocaleDateString('th-TH')}</p></div>
                  <div><p className="text-slate-500 font-bold mb-1">เลขทะเบียนรถ</p><p className="font-extrabold text-slate-900 text-base">{selectedViewRecord.vehicle.plateNumber}</p></div>
                  <div><p className="text-slate-500 font-bold mb-1">ยี่ห้อ/รุ่น</p><p className="font-extrabold text-slate-900 text-base">{selectedViewRecord.vehicle.brand}</p></div>
                  <div><p className="text-slate-500 font-bold mb-1">เลขไมล์ตอนเติม</p><p className="font-extrabold text-slate-900 text-base">{selectedViewRecord.mileage.toLocaleString()} กม.</p></div>
                </div>

                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 grid grid-cols-2 gap-4 text-sm">
                  <div className="col-span-2"><p className="text-amber-800 font-extrabold mb-2 border-b border-amber-200 pb-2">📋 ข้อมูลใบสั่งจ่ายน้ำมัน</p></div>
                  <div><p className="text-slate-500 font-bold mb-1">สถานที่เติม</p><p className="font-extrabold text-slate-900">{selectedViewRecord.stationName || '-'}</p></div>
                  <div><p className="text-slate-500 font-bold mb-1">วันที่สั่งจ่าย</p><p className="font-extrabold text-slate-900">{selectedViewRecord.voucherDate ? new Date(selectedViewRecord.voucherDate).toLocaleDateString('th-TH') : '-'}</p></div>
                  <div><p className="text-slate-500 font-bold mb-1">เล่มที่</p><p className="font-extrabold text-slate-900">{selectedViewRecord.voucherVolume || '-'}</p></div>
                  <div><p className="text-slate-500 font-bold mb-1">เลขที่</p><p className="font-extrabold text-slate-900">{selectedViewRecord.voucherNumber || '-'}</p></div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-sm">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2"><span className="text-slate-600 font-bold">ประเภทน้ำมัน</span><span className="font-extrabold text-slate-900">{selectedViewRecord.fuelType}</span></div>
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2"><span className="text-slate-600 font-bold">ปริมาณ</span><span className="font-extrabold text-slate-900">{selectedViewRecord.quantity.toFixed(2)} ลิตร</span></div>
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2"><span className="text-slate-600 font-bold">ราคาต่อลิตร</span><span className="font-extrabold text-slate-900">{selectedViewRecord.pricePerLiter.toFixed(2)} บาท</span></div>
                  <div className="flex justify-between items-center"><span className="text-slate-600 font-bold">มูลค่าสินค้าก่อนภาษี</span><span className="font-extrabold text-slate-900">{selectedViewRecord.netAmount.toFixed(2)} บาท</span></div>
                  <div className="flex justify-between items-center"><span className="text-slate-600 font-bold">ภาษีมูลค่าเพิ่ม (7%)</span><span className="font-extrabold text-slate-900">{selectedViewRecord.vatAmount.toFixed(2)} บาท</span></div>
                  <div className="flex justify-between items-center bg-cyan-100 p-3 rounded-lg mt-2"><span className="text-cyan-900 font-extrabold text-base">ยอดรวมสุทธิ</span><span className="font-black text-cyan-900 text-lg">{selectedViewRecord.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท</span></div>
                </div>
              </div>
              <div className="p-4 border-t border-slate-200 bg-slate-100 flex justify-end gap-3">
                <button onClick={() => setSelectedViewRecord(null)} className="px-8 py-3 rounded-xl font-extrabold text-white bg-slate-800 hover:bg-slate-900 shadow-md">ปิดหน้าต่าง</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================== */}
      {/* 🖨️ โหมดการพิมพ์ (Print Layout) */}
      {/* ============================== */}
      <div className="print-only">
        
        {/* Header สไตล์ทางการ */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>รายงานสรุปการใช้น้ำมันเชื้อเพลิงยานพาหนะ</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '15px' }}>การไฟฟ้าส่วนภูมิภาค สาขาระโนด</div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid black', paddingBottom: '8px', fontSize: '16px', fontWeight: 'bold' }}>
            <div>วันที่ค้นหา: {filterStartDate ? new Date(filterStartDate).toLocaleDateString('th-TH') : 'ทั้งหมด'} ถึง {filterEndDate ? new Date(filterEndDate).toLocaleDateString('th-TH') : 'ทั้งหมด'}</div>
            <div>ทะเบียนรถ: {filterVehicleId ? vehicles.find(v => v.vehicleId === filterVehicleId)?.plateNumber : 'ทั้งหมด'}</div>
          </div>
        </div>

        {/* สรุปยอดรวม (Summary Box) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', border: '1px solid black', padding: '10px', marginBottom: '20px', fontWeight: 'bold', fontSize: '16px' }}>
          <div>จำนวนที่เติม: {records.length} ครั้ง</div>
          <div>ปริมาณน้ำมันรวม: {totalLiters.toFixed(2)} ลิตร</div>
          <div>รวมค่าใช้จ่ายสุทธิ: {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท</div>
        </div>

        {/* ตารางข้อมูล (ดึงมาทั้งหมด ไม่จำกัดจำนวนหน้า) */}
        <table className="print-table">
          <thead style={{ backgroundColor: '#f0f0f0' }}>
            <tr>
              <th style={{ textAlign: 'center' }}>ลำดับ</th>
              <th style={{ textAlign: 'center' }}>วันที่เติม</th>
              <th style={{ textAlign: 'center' }}>ทะเบียนรถ</th>
              <th style={{ textAlign: 'center' }}>เล่มที่/เลขที่</th>
              <th style={{ textAlign: 'center' }}>ประเภทน้ำมัน</th>
              <th style={{ textAlign: 'center' }}>จำนวน (ลิตร)</th>
              <th style={{ textAlign: 'center' }}>ราคา/ลิตร</th>
              <th style={{ textAlign: 'center' }}>จำนวนเงินรวม</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center' }}>ไม่มีข้อมูลในระบบ</td></tr>
            ) : (
              records.map((r, i) => (
                <tr key={r.id}>
                  <td style={{ textAlign: 'center' }}>{i + 1}</td>
                  <td style={{ textAlign: 'center' }}>{new Date(r.date).toLocaleDateString('th-TH')}</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{r.vehicle.plateNumber}</td>
                  <td style={{ textAlign: 'center' }}>{r.voucherVolume || r.voucherNumber ? `${r.voucherVolume || '-'}/${r.voucherNumber || '-'}` : '-'}</td>
                  <td style={{ textAlign: 'center' }}>{r.fuelType}</td>
                  <td style={{ textAlign: 'right' }}>{r.quantity.toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>{r.pricePerLiter.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{r.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            {/* แถวสรุปท้ายตาราง ติดไปหน้าสุดท้ายเสมอ */}
            {records.length > 0 && (
              <tr style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>
                <td colSpan={5} style={{ textAlign: 'right' }}>รวมทั้งสิ้น</td>
                <td style={{ textAlign: 'right' }}>{totalLiters.toFixed(2)}</td>
                <td style={{ textAlign: 'center' }}>-</td>
                <td style={{ textAlign: 'right', textDecoration: 'underline double' }}>{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            )}
          </tfoot>
        </table>

        {/* ลายเซ็นต์ */}
        <div className="page-break-avoid" style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-around', textAlign: 'center', fontWeight: 'bold', fontSize: '16px' }}>
          <div>
            <p style={{ marginBottom: '40px' }}>ลงชื่อ ....................................................... ผู้จัดทำ</p>
            <p>(.......................................................)</p>
            <p style={{ marginTop: '10px' }}>วันที่ ....... / ....... / .......</p>
          </div>
          <div>
            <p style={{ marginBottom: '40px' }}>ลงชื่อ ....................................................... ผู้ตรวจสอบ</p>
            <p>(.......................................................)</p>
            <p style={{ marginTop: '10px' }}>วันที่ ....... / ....... / .......</p>
          </div>
        </div>

      </div>
    </>
  );
}