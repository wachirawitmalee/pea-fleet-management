"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import Swal from 'sweetalert2';

// 🌟 1. Import Helper Function เฉพาะตัวที่ต้องใช้ (showError)
import { showError } from '@/lib/alert';

export default function ScheduleCalendarPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const res = await fetch('/api/reservations');
      if (res.ok) {
        const data = await res.json();
        
        const calendarEvents = data.map((res: any) => {
          const startDateTime = `${res.startDate.split('T')[0]}T${res.startTime}:00`;
          const endDateTime = `${res.endDate.split('T')[0]}T${res.endTime}:00`;

          return {
            id: res.reservationId,
            title: `${res.vehicle.brand} (${res.vehicle.plateNumber}) - ${res.employee.fullName}`,
            start: startDateTime,
            end: endDateTime,
            backgroundColor: '#f3e8ff',
            borderColor: '#d8b4fe',
            textColor: '#4c1d95',
            extendedProps: {
              purpose: res.purpose,
              destination: res.destination
            }
          };
        });

        setEvents(calendarEvents);
      } else {
        throw new Error('ไม่สามารถโหลดข้อมูลได้');
      }
    } catch (error) {
      // 🌟 2. เปลี่ยนมาใช้ Helper Function สำหรับแจ้ง Error เพื่อให้โค้ดสั้นและคุมโทนเดียวกัน
      showError('โหลดข้อมูลล้มเหลว', 'ไม่สามารถดึงตารางการจองรถได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEventClick = (clickInfo: any) => {
    const event = clickInfo.event;
    
    // 🌟 3. ตรงนี้ยังคงใช้ Swal.fire แบบเดิม เพราะมีการจัด Layout HTML ที่สวยงามเฉพาะเจาะจงอยู่แล้วครับ
    Swal.fire({
      title: '<span style="color: #4c1d95; font-weight: 800; font-size: 1.4rem;">🚙 รายละเอียดการใช้รถ</span>',
      html: `
        <div style="background: #f8fafc; border-radius: 20px; padding: 24px; text-align: left; border: 1px solid #e2e8f0; box-shadow: inset 0 2px 4px 0 rgb(0 0 0 / 0.02);">
          
          <div style="margin-bottom: 16px; border-bottom: 2px dashed #cbd5e1; padding-bottom: 16px;">
            <p style="margin: 0 0 4px 0; font-size: 0.85rem; color: #64748b; font-weight: 600;">ผู้จอง และ รถยนต์ที่ใช้</p>
            <p style="margin: 0; font-size: 1.05rem; color: #0f172a; font-weight: 700;">${event.title}</p>
          </div>
          
          <div style="display: flex; gap: 12px; margin-bottom: 16px;">
            <div style="flex: 1; background: #ffffff; padding: 12px; border-radius: 12px; border: 1px solid #f1f5f9; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);">
              <p style="margin: 0 0 4px 0; font-size: 0.8rem; color: #8b5cf6; font-weight: 700;">🟢 เริ่มเดินทาง</p>
              <p style="margin: 0; font-size: 0.95rem; color: #1e293b; font-weight: 600;">${event.start.toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })} น.</p>
            </div>
            <div style="flex: 1; background: #ffffff; padding: 12px; border-radius: 12px; border: 1px solid #f1f5f9; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);">
              <p style="margin: 0 0 4px 0; font-size: 0.8rem; color: #f43f5e; font-weight: 700;">🔴 สิ้นสุด</p>
              <p style="margin: 0; font-size: 0.95rem; color: #1e293b; font-weight: 600;">${event.end ? event.end.toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) + ' น.' : 'ไม่ระบุ'}</p>
            </div>
          </div>
          
          <div style="margin-bottom: 16px;">
            <p style="margin: 0 0 4px 0; font-size: 0.85rem; color: #64748b; font-weight: 600;">📍 สถานที่ปลายทาง</p>
            <p style="margin: 0; font-size: 1rem; color: #0f172a; font-weight: 600;">${event.extendedProps.destination}</p>
          </div>
          
          <div>
            <p style="margin: 0 0 6px 0; font-size: 0.85rem; color: #64748b; font-weight: 600;">🎯 วัตถุประสงค์การใช้งาน</p>
            <p style="margin: 0; font-size: 0.95rem; background: #f3e8ff; padding: 12px; border-radius: 12px; color: #4c1d95; font-weight: 600; border: 1px solid #e9d5ff;">
              ${event.extendedProps.purpose}
            </p>
          </div>
        </div>
      `,
      confirmButtonText: 'ปิดหน้าต่าง',
      confirmButtonColor: '#9333ea',
      width: '32em',
      customClass: {
        popup: 'rounded-[2rem]',
        confirmButton: 'rounded-xl px-8 py-3 font-bold text-md'
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans">
      <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-purple-700 transition-colors group">
            <div className="p-2 bg-slate-100 rounded-full group-hover:bg-purple-100 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            </div>
            <span className="font-semibold hidden sm:block">กลับหน้าหลัก</span>
          </Link>
          <div className="text-center">
            <h1 className="text-xl font-bold text-slate-800">ตารางการใช้งานรถยนต์</h1>
            <p className="text-xs text-purple-600 font-medium">สถานที่ปฏิบัติงาน: สาขาระโนด</p>
          </div>
          <div className="w-[100px] flex justify-end">
            <Link href="/reservation" className="hidden md:flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              จองรถ
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-white/80 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center h-[500px] gap-4">
              <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
              <p className="text-slate-500 font-medium animate-pulse">กำลังโหลดตารางงาน...</p>
            </div>
          ) : (
            <div className="calendar-container relative z-10">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                buttonText={{
                  today: 'วันนี้',
                  month: 'เดือน',
                  week: 'สัปดาห์',
                  day: 'วัน'
                }}
                locale="th"
                events={events}
                eventClick={handleEventClick}
                height="auto"
                eventTimeFormat={{
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                }}
                displayEventEnd={true}
              />
            </div>
          )}
        </div>
      </main>

      {/* บังคับสีตัวหนังสือในปฏิทินให้เข้มทั้งหมด ชนกับ Dark Mode */}
      <style dangerouslySetInnerHTML={{__html: `
        .fc {
          color: #0f172a !important; /* บังคับสีดำเข้ม */
          --fc-border-color: #e2e8f0;
          --fc-page-bg-color: #ffffff;
        }
        
        /* บังคับสีตัวเลขวันที่ (1, 2, 3...) */
        .fc-daygrid-day-number {
          color: #0f172a !important;
          font-weight: 700;
          font-size: 1rem;
          padding: 8px !important;
        }

        /* บังคับสีหัวตาราง (จันทร์, อังคาร...) */
        .fc-col-header-cell-cushion {
          color: #1e293b !important;
          font-weight: 800;
          padding: 12px 8px !important;
        }

        /* บังคับสีในป้ายการจอง */
        .fc-event-title, .fc-event-time, .fc-event-main {
          color: #4c1d95 !important;
          font-weight: 700 !important;
        }
        
        .fc-event {
          background-color: #f3e8ff !important;
          border: 1px solid #d8b4fe !important;
          cursor: pointer;
          border-radius: 6px;
          padding: 4px 6px;
          box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
        }

        /* ตกแต่งปุ่มเมนูด้านบน */
        .fc .fc-button-primary {
          background-color: #f8fafc;
          border-color: #e2e8f0;
          color: #334155 !important;
          font-weight: 700;
          border-radius: 0.75rem;
          text-transform: capitalize;
        }
        .fc .fc-button-primary:not(:disabled).fc-button-active, 
        .fc .fc-button-primary:not(:disabled):active {
          background-color: #9333ea !important;
          border-color: #7e22ce !important;
          color: white !important;
        }
        .fc .fc-toolbar-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0f172a !important;
        }
        .fc-daygrid-event-dot {
          border-color: #7e22ce !important;
        }
      `}} />
    </div>
  );
}