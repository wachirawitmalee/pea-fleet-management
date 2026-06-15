"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

// 🌟 1. Import Helper Functions ที่เราสร้างไว้มาใช้งาน
import { showLoading, showSuccess, showError } from '@/lib/alert';

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // States สำหรับการจัดการพนักงานรายบุคคล
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [isEditingSingle, setIsEditingSingle] = useState(false);
  const [singleFormData, setSingleFormData] = useState({
    employeeId: '',
    fullName: '',
    position: '',
    department: '',
    workPlace: 'กฟส.ระโนด',
    status: 'ACTIVE' // 🌟 เพิ่มสถานะในฟอร์ม
  });

  // States สำหรับการนำเข้าผ่าน Excel
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/employees', { cache: 'no-store' });
      if (res.ok) setEmployees(await res.json());
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const openAddSingleModal = () => {
    setIsEditingSingle(false);
    setSingleFormData({
      employeeId: '', fullName: '', position: '', department: '', workPlace: 'กฟส.ระโนด', status: 'ACTIVE'
    });
    setIsSingleModalOpen(true);
  };

  const openEditSingleModal = (emp: any) => {
    setIsEditingSingle(true);
    setSingleFormData({
      employeeId: emp.employeeId,
      fullName: emp.fullName,
      position: emp.position,
      department: emp.department,
      workPlace: emp.workPlace || 'กฟส.ระโนด',
      status: emp.status || 'ACTIVE'
    });
    setIsSingleModalOpen(true);
  };

  const handleSingleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSingleFormData({ ...singleFormData, [e.target.name]: e.target.value });
  };

  const handleSingleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleFormData.employeeId || !singleFormData.fullName || !singleFormData.position || !singleFormData.department) {
      showError('ข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลพนักงานให้ครบถ้วนครับ');
      return;
    }

    // 🌟 2. เรียก Loading Spinner ทันทีที่กดปุ่มบันทึก
    showLoading('กำลังบันทึกข้อมูล...', 'กรุณารอสักครู่ ระบบกำลังอัปเดตข้อมูลพนักงาน');

    try {
      const method = isEditingSingle ? 'PUT' : 'POST';
      const res = await fetch('/api/employees', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(singleFormData) 
      });

      if (res.ok) {
        // 🌟 3. เรียกป๊อบอัพสำเร็จ
        await showSuccess('บันทึกข้อมูลสำเร็จ');
        setIsSingleModalOpen(false);
        fetchData(); // โหลดข้อมูลใหม่
      } else {
        const data = await res.json();
        // 🌟 โชว์ Error ที่ส่งมาจาก API จริงๆ
        showError('เกิดข้อผิดพลาด', data.error || 'ไม่สามารถบันทึกได้');
      }
    } catch (error) {
      showError('ข้อผิดพลาด', 'เกิดปัญหาการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const handleSoftDelete = async (id: string, name: string) => {
    // ตรงนี้ยังคงใช้ Swal.fire แบบเดิมเพราะต้องมีปุ่มให้กด ยกเลิก/ตกลง
    const conf = await Swal.fire({
      title: 'ระงับสิทธิ์พนักงาน?',
      text: `ต้องการปรับสถานะ คุณ ${name} เป็นพนักงานลาออก/ย้าย หรือไม่? (ประวัติในระบบจะไม่สูญหาย)`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'ใช่, ระงับสิทธิ์เลย',
      cancelButtonText: 'ยกเลิก'
    });

    if (conf.isConfirmed) {
      // 🌟 4. เรียก Loading Spinner หลังจากกดยืนยัน
      showLoading('กำลังอัปเดตสถานะ...', 'กรุณารอสักครู่ครับ');

      try {
        const res = await fetch(`/api/employees?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
          await showSuccess('เปลี่ยนสถานะเรียบร้อย');
          fetchData();
        } else {
          showError('เกิดข้อผิดพลาด', 'ไม่สามารถระงับสิทธิ์ได้');
        }
      } catch (error) { 
        showError('ข้อผิดพลาด', 'เกิดปัญหาเชื่อมต่อเซิร์ฟเวอร์'); 
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      const mappedData = data.map((row: any) => ({
        employeeId: row['รหัส']?.toString() || '',
        fullName: row['ชื่อ - สกุล'] || '',
        position: row['ตำแหน่ง'] || '',
        department: row['สังกัด'] || '',
        workPlace: 'กฟส.ระโนด',
        status: 'ACTIVE'
      })).filter(emp => emp.employeeId && emp.fullName);

      if (mappedData.length > 0) {
        setPreviewData(mappedData);
        setIsPreviewModalOpen(true);
      } else {
        showError('ไม่พบข้อมูล', 'ไม่พบข้อมูลที่ตรงกับคอลัมน์ รหัส หรือ ชื่อ - สกุล ในไฟล์ Excel');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ""; 
  };

  const handleEditPreview = (index: number, field: string, value: string) => {
    const updated = [...previewData];
    updated[index][field] = value;
    setPreviewData(updated);
  };

  const handleRemovePreviewRow = (index: number) => {
    const updated = previewData.filter((_, i) => i !== index);
    setPreviewData(updated);
  };

  const handleConfirmImport = async () => {
    setIsSavingBulk(true);

    // 🌟 5. เรียก Loading Spinner สำหรับการบันทึกจำนวนมาก
    showLoading('กำลังนำเข้าข้อมูล...', `กำลังอัปเดตข้อมูลพนักงานทั้งหมด ${previewData.length} รายการ`);

    try {
      const res = await fetch('/api/employees/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employees: previewData })
      });
      
      if (res.ok) {
        await showSuccess('อัปเดตพนักงานสำเร็จ');
        setIsPreviewModalOpen(false);
        fetchData();
      } else {
        showError('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลแบบกลุ่มได้');
      }
    } catch (error) { 
      showError('ข้อผิดพลาด', 'เกิดปัญหาการเชื่อมต่อเซิร์ฟเวอร์'); 
    } finally { 
      setIsSavingBulk(false); 
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || emp.employeeId.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans relative">
      <nav className="bg-slate-900 text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-slate-400 hover:text-white font-bold text-sm">← กลับแดชบอร์ด</Link>
            <span className="text-slate-600">|</span>
            <h1 className="text-md font-bold text-blue-400">จัดการรายชื่อพนักงาน</h1>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={openAddSingleModal} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all">+ เพิ่มพนักงานใหม่</button>
             <label className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer flex items-center gap-2">
               📥 นำเข้าจาก Excel <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" />
             </label>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 mt-8 space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-300 shadow-sm">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-300 flex items-center gap-3">
            <span className="text-slate-400 pl-2">🔍</span>
            <input type="text" placeholder="ค้นหาด้วยรหัสพนักงาน หรือชื่อ-นามสกุล..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full text-slate-900 font-bold bg-transparent outline-none" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-300 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-blue-600 font-bold animate-pulse">กำลังโหลดข้อมูล...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 border-b border-slate-300">
                  <tr>
                    <th className="p-4 font-bold text-slate-800 text-sm">รหัสพนักงาน</th>
                    <th className="p-4 font-bold text-slate-800 text-sm">ชื่อ-นามสกุล</th>
                    <th className="p-4 font-bold text-slate-800 text-sm">ตำแหน่ง</th>
                    <th className="p-4 font-bold text-slate-800 text-sm">สถานะ</th>
                    <th className="p-4 font-bold text-slate-800 text-sm text-center">จัดการข้อมูล</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.employeeId} className={`hover:bg-slate-50 transition-colors ${emp.status === 'INACTIVE' ? 'bg-red-50/40 opacity-70' : ''}`}>
                      <td className="p-4 font-mono font-extrabold text-slate-950 text-base">{emp.employeeId}</td>
                      <td className="p-4 font-extrabold text-slate-900">{emp.fullName}</td>
                      <td className="p-4 font-bold text-slate-700">{emp.position}</td>
                      <td className="p-4 text-sm font-bold">
                        {/* 🌟 แสดงแถบสถานะ ทำงานอยู่ หรือ ลาออก/ย้าย */}
                        {emp.status === 'INACTIVE' ? (
                          <span className="px-2.5 py-1 bg-red-100 text-red-800 border border-red-300 rounded-lg text-xs font-extrabold">❌ ลาออก/ย้าย</span>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-extrabold">🟢 ทำงานอยู่</span>
                        )}
                      </td>
                      <td className="p-4 flex justify-center gap-2">
                        <button onClick={() => openEditSingleModal(emp)} className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold text-xs rounded-lg border border-blue-300 transition-colors">📝 แก้ไข</button>
                        {emp.status !== 'INACTIVE' && (
                          <button onClick={() => handleSoftDelete(emp.employeeId, emp.fullName)} className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs rounded-lg border border-red-300 transition-colors">🚫 ระงับสิทธิ์</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* MODAL 1: ฟอร์มเพิ่ม/แก้ไขพนักงานรายบุคคล */}
      {isSingleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] border border-slate-300 shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-100">
              <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2"><span>👤</span> {isEditingSingle ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มพนักงานใหม่'}</h3>
              <button onClick={() => setIsSingleModalOpen(false)} className="w-10 h-10 bg-white border border-slate-300 rounded-full flex items-center justify-center font-bold text-slate-600">✕</button>
            </div>
            
            <form onSubmit={handleSingleSave}>
              <div className="p-6 bg-white space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">รหัสพนักงาน *</label>
                  <input type="text" name="employeeId" disabled={isEditingSingle} required value={singleFormData.employeeId} onChange={handleSingleFormChange} className={`w-full p-3 border-2 border-slate-400 bg-white font-extrabold text-slate-900 rounded-xl outline-none focus:border-blue-500 ${isEditingSingle ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-300' : ''}`} placeholder="กรอกรหัสพนักงาน" />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">ชื่อ - นามสกุล *</label>
                  <input type="text" name="fullName" required value={singleFormData.fullName} onChange={handleSingleFormChange} className="w-full p-3 border-2 border-slate-400 bg-white font-extrabold text-slate-900 rounded-xl outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">ตำแหน่ง *</label>
                  <input type="text" name="position" required value={singleFormData.position} onChange={handleSingleFormChange} className="w-full p-3 border-2 border-slate-400 bg-white font-extrabold text-slate-900 rounded-xl outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">สังกัด / แผนก *</label>
                  <input type="text" name="department" required value={singleFormData.department} onChange={handleSingleFormChange} className="w-full p-3 border-2 border-slate-400 bg-white font-extrabold text-slate-900 rounded-xl outline-none focus:border-blue-500" />
                </div>
                
                {/* 🌟 เพิ่มตัวเลือกสถานะการทำงานในกล่องแก้ไข */}
                {isEditingSingle && (
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">สถานะการทำงาน</label>
                    <select name="status" value={singleFormData.status} onChange={handleSingleFormChange} className="w-full p-3 border-2 border-slate-400 bg-white font-extrabold text-slate-900 rounded-xl outline-none focus:border-blue-500 cursor-pointer">
                      <option value="ACTIVE">🟢 ทำงานอยู่ปกติ (เปิดสิทธิ์การจองรถ)</option>
                      <option value="INACTIVE">❌ ลาออก / ย้ายไปที่อื่น (ระงับสิทธิ์การจองรถ)</option>
                    </select>
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-slate-200 bg-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsSingleModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-300">ยกเลิก</button>
                <button type="submit" className="px-8 py-2.5 rounded-xl font-extrabold text-white bg-slate-900 hover:bg-black shadow-lg">💾 บันทึกข้อมูล</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: หน้า Preview ตรวจสอบ Excel */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2rem] border border-slate-300 shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-100">
              <div>
                <h3 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">👀 ตรวจสอบข้อมูลก่อนยืนยัน (Excel)</h3>
                <p className="text-sm font-bold text-emerald-600 mt-1">พบข้อมูลทั้งหมด {previewData.length} รายการ</p>
              </div>
              <button onClick={() => setIsPreviewModalOpen(false)} className="w-10 h-10 bg-white border border-slate-300 rounded-full flex items-center justify-center font-bold text-slate-600">✕</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-white">
              <div className="overflow-x-auto border border-slate-300 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 sticky top-0 border-b border-slate-300">
                    <tr>
                      <th className="p-3 text-xs font-extrabold text-slate-700 uppercase">รหัสพนักงาน</th>
                      <th className="p-3 text-xs font-extrabold text-slate-700 uppercase">ชื่อ - นามสกุล</th>
                      <th className="p-3 text-xs font-extrabold text-slate-700 uppercase">ตำแหน่ง</th>
                      <th className="p-3 text-xs font-extrabold text-slate-700 uppercase">สังกัด</th>
                      <th className="p-3 text-xs font-extrabold text-slate-700 uppercase text-center">ลบแถว</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {previewData.map((emp, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                        <td className="p-2"><input type="text" value={emp.employeeId} onChange={(e) => handleEditPreview(idx, 'employeeId', e.target.value)} className="w-full p-2 border-2 border-slate-400 bg-white font-extrabold text-slate-900 rounded-lg outline-none focus:border-blue-500" /></td>
                        <td className="p-2"><input type="text" value={emp.fullName} onChange={(e) => handleEditPreview(idx, 'fullName', e.target.value)} className="w-full p-2 border-2 border-slate-400 bg-white font-extrabold text-slate-900 rounded-lg outline-none focus:border-blue-500" /></td>
                        <td className="p-2"><input type="text" value={emp.position} onChange={(e) => handleEditPreview(idx, 'position', e.target.value)} className="w-full p-2 border-2 border-slate-400 bg-white font-extrabold text-slate-700 rounded-lg outline-none focus:border-blue-500" /></td>
                        <td className="p-2"><input type="text" value={emp.department} onChange={(e) => handleEditPreview(idx, 'department', e.target.value)} className="w-full p-2 border-2 border-slate-400 bg-white font-extrabold text-slate-600 rounded-lg outline-none focus:border-blue-500" /></td>
                        <td className="p-2 text-center">
                          <button onClick={() => handleRemovePreviewRow(idx)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
                            <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button type="button" onClick={() => setIsPreviewModalOpen(false)} className="px-8 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-300 shadow-sm">ยกเลิก</button>
              <button onClick={handleConfirmImport} disabled={isSavingBulk || previewData.length === 0} className={`px-10 py-3 rounded-xl font-extrabold text-white shadow-lg transition-all ${isSavingBulk ? 'bg-slate-400 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                {isSavingBulk ? 'กำลังบันทึกข้อมูล...' : `🚀 ยืนยันบันทึกทั้ง ${previewData.length} รายการ`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}