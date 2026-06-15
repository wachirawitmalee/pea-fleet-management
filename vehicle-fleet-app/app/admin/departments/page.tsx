"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';

// 🌟 1. Import Helper Functions มาใช้งาน
import { showLoading, showSuccess, showError } from '@/lib/alert';

export default function DepartmentManagementPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [departmentCode, setDepartmentCode] = useState('');
  const [departmentName, setDepartmentName] = useState('');

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/departments');
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setDepartmentCode('');
    setDepartmentName('');
    setIsModalOpen(true);
  };

  const openEditModal = (dept: any) => {
    setIsEditMode(true);
    setDepartmentCode(dept.departmentCode);
    setDepartmentName(dept.departmentName);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🌟 เช็คแค่ชื่อแผนกอย่างเดียว เพราะรหัสให้ระบบเจนให้
    if (!departmentName) {
      showError('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกชื่อแผนกครับ');
      return;
    }

    const deptData = { departmentCode, departmentName };
    const method = isEditMode ? 'PUT' : 'POST';

    // 🌟 2. เรียก Loading Spinner ทันทีที่กดปุ่มบันทึก
    showLoading('กำลังบันทึกข้อมูล...', 'กรุณารอสักครู่ ระบบกำลังอัปเดตข้อมูลแผนก');

    try {
      const res = await fetch('/api/departments', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deptData)
      });
      const result = await res.json();

      if (res.ok) {
        // 🌟 3. เรียกป๊อบอัพสำเร็จ
        await showSuccess('บันทึกข้อมูลสำเร็จ!');
        setIsModalOpen(false);
        fetchDepartments();
      } else {
        showError('เกิดข้อผิดพลาด', result.error || 'ไม่สามารถบันทึกได้');
      }
    } catch (e) {
      showError('เชื่อมต่อล้มเหลว', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  const handleDelete = async (code: string, name: string) => {
    // ตรงนี้ยังคงใช้ Swal.fire แบบเดิมเพราะต้องมีปุ่มให้กด ยกเลิก/ตกลง
    const confirm = await Swal.fire({
      title: 'ยืนยันการลบแผนก?',
      text: `คุณต้องการลบแผนก "${name}" ใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'ใช่, ลบออกเลย',
      cancelButtonText: 'ยกเลิก',
      customClass: { popup: 'rounded-[2rem]', confirmButton: 'rounded-xl px-6 py-3 font-bold', cancelButton: 'rounded-xl px-6 py-3 font-bold' }
    });

    if (confirm.isConfirmed) {
      // 🌟 4. เรียก Loading Spinner หลังจากกดยืนยัน
      showLoading('กำลังลบข้อมูล...', 'กรุณารอสักครู่ครับ');

      try {
        const res = await fetch(`/api/departments?id=${code}`, { method: 'DELETE' });
        const result = await res.json();
        
        if (res.ok) {
          await showSuccess('ลบแผนกเรียบร้อย');
          fetchDepartments();
        } else {
          showError('ไม่สามารถลบได้', result.error || 'เกิดข้อผิดพลาดในการลบ');
        }
      } catch (e) {
        showError('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
      }
    }
  };

  const filteredDepts = departments.filter(d => 
    d.departmentCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.departmentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans relative">
      <nav className="bg-slate-900 text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-slate-400 hover:text-white font-bold flex items-center gap-1 text-sm transition-colors">
              ← กลับแดชบอร์ด
            </Link>
            <span className="text-slate-600">|</span>
            <h1 className="text-md font-bold text-purple-400">ระบบจัดการแผนก</h1>
          </div>
          <button onClick={openAddModal} className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all shadow-md flex items-center gap-1">
            ➕ เพิ่มแผนกใหม่
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 mt-8 space-y-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <span className="text-slate-400 pl-2">🔍</span>
          <input 
            type="text" 
            placeholder="ค้นหาด้วยรหัสแผนก หรือ ชื่อแผนก..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-slate-800 bg-transparent outline-none font-medium placeholder:text-slate-400"
          />
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-purple-600 font-bold animate-pulse">กำลังโหลดข้อมูลแผนก...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4 font-bold text-slate-500 text-sm">รหัสแผนก</th>
                    <th className="p-4 font-bold text-slate-500 text-sm">ชื่อแผนก</th>
                    <th className="p-4 font-bold text-slate-500 text-sm text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDepts.length === 0 ? (
                    <tr><td colSpan={3} className="p-8 text-center text-slate-400 font-medium">ยังไม่มีข้อมูลแผนกในระบบ</td></tr>
                  ) : (
                    filteredDepts.map((d) => (
                      <tr key={d.departmentCode} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-4 font-mono font-bold text-purple-700 bg-purple-50/10 rounded-lg">{d.departmentCode}</td>
                        <td className="p-4 font-bold text-slate-800">{d.departmentName}</td>
                        <td className="p-4 flex gap-2 justify-center">
                          <button onClick={() => openEditModal(d)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all">แก้ไข</button>
                          <button onClick={() => handleDelete(d.departmentCode, d.departmentName)} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-xs transition-all">ลบ</button>
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl max-w-md w-full p-8 space-y-6">
            <h3 className="text-xl font-extrabold text-slate-800">
              {isEditMode ? '✏️ แก้ไขข้อมูลแผนก' : '🏢 เพิ่มแผนกใหม่'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">รหัสแผนก</label>
                {/* 🌟 ล็อกช่องนี้เป็นสีเทา ห้ามพิมพ์ ให้แอปจัดการเอง */}
                <input 
                  type="text" 
                  disabled={true}
                  value={isEditMode ? departmentCode : 'ระบบจะสร้างรหัสให้โดยอัตโนมัติ'} 
                  className="w-full p-3 border rounded-xl font-mono text-sm font-bold outline-none text-slate-400 bg-slate-100 cursor-not-allowed" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ชื่อแผนก <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={departmentName} 
                  onChange={(e) => setDepartmentName(e.target.value)} 
                  placeholder="เช่น แผนกปฏิบัติการและบำรุงรักษา" 
                  className="w-full p-3 border rounded-xl bg-slate-50 text-slate-800 font-bold outline-none focus:bg-white focus:ring-2 focus:ring-purple-500" 
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-1/2 py-3 border rounded-xl text-slate-500 font-bold bg-slate-50 hover:bg-slate-100 transition-colors">ยกเลิก</button>
                <button type="submit" className="w-1/2 py-3 rounded-xl text-white font-bold bg-purple-600 hover:bg-purple-700 shadow-md transition-all">บันทึกข้อมูล</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}