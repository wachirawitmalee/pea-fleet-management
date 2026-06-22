"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { showLoading, showSuccess, showError } from '@/lib/alert';

export default function AdminSettingsPage() {
  const [alertEmail, setAlertEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setAlertEmail(data.alertEmail || '');
      }
    } catch (e) {
      showError('ผิดพลาด', 'ไม่สามารถโหลดการตั้งค่าได้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    showLoading('กำลังบันทึกตั้งค่า...', 'กรุณารอสักครู่ระบบกำลังบันทึกอีเมลของคุณ');

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertEmail })
      });

      if (res.ok) {
        await showSuccess('บันทึกตั้งค่าสำเร็จ!');
        fetchSettings();
      } else {
        showError('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้');
      }
    } catch (error) {
      showError('เชื่อมต่อล้มเหลว', 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ฟังก์ชันสั่งยิงให้ตรวจข้อมูลและลองส่งอีเมลเข้า Gmail ทันที
  const handleTestTriggerAlert = async () => {
    if (!alertEmail) {
      showError('ข้อมูลไม่ครบ', 'กรุณาระบุและบันทึกอีเมลแจ้งเตือนก่อนกดทดสอบครับ');
      return;
    }

    setIsTesting(true);
    showLoading('กำลังประมวลผลระบบ...', 'ระบบหลังบ้านกำลังเช็คสภาพรถยนต์ และร่างอีเมลส่งออกไป');

    try {
      const res = await fetch('/api/alerts/send', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        await showSuccess('สำเร็จ!', data.message || 'ส่งเมลเรียบร้อย');
      } else {
        showError('ส่งอีเมลไม่สำเร็จ', data.error || 'เกิดปัญหาที่เซิร์ฟเวอร์ส่งเมล');
      }
    } catch (error) {
      showError('ระบบขัดข้อง', 'ไม่สามารถติดต่อ API ส่งอีเมลแจ้งเตือนได้');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans relative">
      <nav className="bg-slate-900 text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-slate-400 hover:text-white font-bold text-sm">← กลับแดชบอร์ด</Link>
            <span className="text-slate-600">|</span>
            <h1 className="text-md font-bold text-purple-400">ตั้งค่าระบบแจ้งเตือนอัตโนมัติ</h1>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 mt-8 space-y-6">
        <div className="bg-white/90 backdrop-blur-md p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200">
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2"><span>⚙️</span> การตั้งค่าแจ้งเตือน (Notifications Setting)</h2>
            <p className="text-slate-500 text-sm mt-1">กำหนดปลายทางเพื่อรับรายงานสรุปสถานะรถยนต์ ต่อภาษี และรอบตรวจเช็คระยะทางประจำวันอัตโนมัติ</p>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-purple-600 font-bold animate-pulse">กำลังดึงข้อมูลตั้งค่า...</div>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-300 space-y-4 shadow-sm">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-2">📬 อีเมลกลางสำหรับรับการแจ้งเตือน (Email Address) *</label>
                  <input 
                    type="email" 
                    required 
                    value={alertEmail} 
                    onChange={(e) => setAlertEmail(e.target.value)} 
                    className="w-full p-3.5 rounded-xl border-2 border-slate-400 bg-white font-bold text-slate-950 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-200 shadow-sm" 
                    placeholder="ตัวอย่าง: department.pea@gmail.com" 
                  />
                  <p className="text-xs text-slate-500 font-semibold mt-2">💡 แนะนำให้ใช้อีเมลส่วนกลางของแผนก หรืออีเมลที่แอดมินเปิดเช็คดูเป็นประจำทุกวัน</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button 
                  type="submit" 
                  disabled={isSubmitting || isTesting} 
                  className="w-full sm:w-1/2 bg-slate-900 hover:bg-black text-white font-extrabold py-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-md"
                >
                  💾 บันทึกที่อยู่อีเมล
                </button>
                
                <button 
                  type="button" 
                  onClick={handleTestTriggerAlert} 
                  disabled={isSubmitting || isTesting} 
                  className="w-full sm:w-1/2 bg-purple-100 border-2 border-purple-300 hover:bg-purple-200 text-purple-800 font-extrabold py-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-md"
                >
                  🚀 ทดสอบรันคำสั่งส่งอีเมลแจ้งเตือนเลย
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl shadow-sm">
          <h4 className="font-extrabold text-amber-800 mb-2 text-sm flex items-center gap-2"><span>💡</span> คำแนะนำเกี่ยวกับการรันระบบส่งอัตโนมัติ (Automation Note)</h4>
          <p className="text-xs text-amber-900 leading-relaxed font-bold">
            หลังจากที่คุณดีพอยระบบขึ้นคลาวด์ Vercel แล้ว ตัว API <code className="bg-white/80 px-1.5 py-0.5 rounded border border-amber-300 font-mono">/api/alerts/send</code> นี้จะถูกเรียกใช้ได้สองทาง คือ แอดมินกดปุ่ม "ทดสอบ" ด้านบนนี้ด้วยตัวเอง หรือนำ URL ดังกล่าวไปผูกเข้ากับระบบ **Vercel Cron Jobs** (ตั้งเวลาในไฟล์ <code className="bg-white/80 px-1.5 py-0.5 rounded border border-amber-300 font-mono">vercel.json</code>) เพื่อสั่งให้หลังบ้านวิ่งตรวจสอบข้อมูลและส่งเมลรายงานเข้ากล่องข้อความของคุณโดยอัตโนมัติทุกๆ เช้า เวลา 07.00 น. ได้เลยครับ
          </p>
        </div>
      </main>
    </div>
  );
}