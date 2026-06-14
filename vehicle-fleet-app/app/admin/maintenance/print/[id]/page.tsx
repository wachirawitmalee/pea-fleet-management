"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function PrintMaintenanceTicketPage() {
  const params = useParams();
  const ticketId = params.id as string;
  const [ticket, setTicket] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTicketData = async () => {
      try {
        const res = await fetch('/api/maintenance');
        if (res.ok) {
          const allTickets = await res.json();
          // ค้นหาใบแจ้งซ่อมที่ตรงกับ ID ที่ส่งมา
          const foundTicket = allTickets.find((t: any) => t.ticketId === ticketId);
          setTicket(foundTicket);
        }
      } catch (error) {
        console.error("Error fetching ticket:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTicketData();
  }, [ticketId]);

  // สั่งให้เปิดหน้าต่าง Print ของเบราว์เซอร์อัตโนมัติเมื่อโหลดข้อมูลเสร็จ
  useEffect(() => {
    if (ticket && !isLoading) {
      // หน่วงเวลาเล็กน้อยให้ฟอนต์ THSarabunNew โหลดเสร็จก่อน
      setTimeout(() => {
        window.print();
      }, 800);
    }
  }, [ticket, isLoading]);

  if (isLoading) {
    return <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>กำลังเตรียมเอกสาร...</div>;
  }

  if (!ticket) {
    return <div style={{ padding: '50px', textAlign: 'center', color: 'red', fontFamily: 'sans-serif' }}>ไม่พบข้อมูลใบแจ้งซ่อม</div>;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        /* โหลดไฟล์ฟอนต์ 'THSarabunNew' (.ttf) สำหรับใช้ฝังลงในเอกสาร PDF โดยเฉพาะ */
        @font-face {
          font-family: 'THSarabunNew';
          src: url('https://cdn.jsdelivr.net/gh/thaifonts/THSarabunNew/fonts/THSarabunNew.ttf') format('truetype');
        }

        body { margin: 0; padding: 0; background: #525659; display: flex; justify-content: center; }
        
        #print-area {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm 20mm;
          box-sizing: border-box;
          font-family: 'THSarabunNew', 'TH SarabunPSK', sans-serif !important;
          font-size: 16px !important;
          line-height: 1.45 !important;
          color: black;
          background: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
          margin-top: 20px;
          margin-bottom: 20px;
        }

        /* ซ่อนพื้นหลังสีเทาตอนกดพิมพ์จริง */
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white; display: block; }
          #print-area { margin: 0; box-shadow: none; position: absolute; left: 0; top: 0; height: 296mm; overflow: hidden; }
        }

        /* ปรับสัดส่วนภายในเพื่อให้เข้ากับขนาดฟอนต์ 16px และไม่ล้น 1 หน้า */
        .p-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px; }
        .p-logo { width: 2.2cm; height: auto; }
        .p-title { text-align: center; font-weight: bold; font-size: 22px; margin-bottom: 12px; }
        .p-paragraph { text-align: justify; text-justify: distribute-all-lines; margin-bottom: 8px; width: 100%; display: block; line-height: 1.5; }
        .p-val-inline { display: inline-block; border-bottom: 1px dotted #000; padding: 0 5px; text-align: center; min-width: 50px; font-weight: bold; line-height: 1.4; margin: 0 2px; }
        .p-indent { margin-left: 1.5cm; }
        .p-box { border: 1px solid black; padding: 10px; margin-top: 10px; min-height: 80px; border-radius: 4px; display: flex; align-items: center; justify-content: center; text-align: center; font-weight: bold; font-size: 18px; }
        .p-sign-block { margin-top: 20px; float: right; width: 280px; text-align: center; margin-right: 0px; }
        .p-sign-line { white-space: nowrap; margin-bottom: 5px; display: block; }
        .p-sign-name { font-weight: bold; margin-bottom: 5px; display: block; }
        .clearfix { clear: both; margin-bottom: 20px; }
        .p-table { width: 100%; border-collapse: collapse; margin-top: 20px; border: 1px solid black; table-layout: fixed; }
        .p-table td { border: 1px solid black; padding: 10px; height: 160px; vertical-align: top; width: 50%; position: relative; }
        .p-cell-container { display: flex; flex-direction: column; justify-content: space-between; height: 100%; }
        .p-table-title { font-weight: bold; display: block; margin-bottom: 5px; font-size: 18px; }
        .p-table-content { padding-left: 10px; line-height: 1.5; }
        .p-dotted-line { border-bottom: 1px dotted black; display: block; height: 20px; width: 95%; margin-left: 5px; margin-bottom: 5px; }
        .p-table-bottom { text-align: center; width: 100%; margin-bottom: 5px; }
        .p-table-sign-row { white-space: nowrap; margin-top: 15px; }
      `}} />

      <div id="print-area">
        <div className="p-header">
          {/* โลโก้ PEA */}
          <img src="https://img2.pic.in.th/images9096612fa657aad5.png" className="p-logo" alt="PEA Logo" />
          <div style={{ textAlign: 'right' }}>
            <div><b>เลขที่:</b> <span>{ticket.ticketNumber}</span></div>
            <div><b>วันที่:</b> <span>{new Date(ticket.requestDate).toLocaleDateString('th-TH')}</span></div>
          </div>
        </div>
        
        <div className="p-title">ใบแจ้งซ่อมยานพาหนะ</div>
        
        <div className="p-paragraph">
          <b>เรื่อง</b> &nbsp;รายงานการแจ้ง ซ่อมแซม ยานพาหนะทะเบียน<span className="p-val-inline">{ticket.vehicle.plateNumber}</span>&nbsp;ใช้ประจำแผนก<span className="p-val-inline">{ticket.employee.department || '-'}</span><br/><br/>
          <b>เรียน</b> &nbsp;ผจก.กฟส.ระโนด ผ่าน..................................................<br/><br/>
          <span className="p-indent">ข้าพเจ้า</span><span className="p-val-inline" style={{ minWidth: '150px' }}>{ticket.employee.fullName}</span>&nbsp;ตำแหน่ง<span className="p-val-inline" style={{ minWidth: '100px' }}>{ticket.employee.position}</span>&nbsp;แผนก<span className="p-val-inline" style={{ minWidth: '100px' }}>{ticket.employee.department || '-'}</span>&nbsp;มีความประสงค์ขอแจ้งซ่อมยานพาหนะ ทะเบียน<span className="p-val-inline" style={{ minWidth: '100px' }}>{ticket.vehicle.plateNumber}</span>&nbsp;ยี่ห้อ<span className="p-val-inline" style={{ minWidth: '100px' }}>{ticket.vehicle.brand}</span>&nbsp;เลขไมล์ปัจจุบัน<span className="p-val-inline" style={{ minWidth: '80px' }}>{ticket.mileage.toLocaleString()}</span>&nbsp;กม.
          เนื่องจากมีความชำรุดขัดข้องดังรายการต่อไปนี้
        </div>
        
        <div className="p-box">{ticket.issueDesc}</div>
        
        <div className="p-sign-block">
          <div className="p-sign-line">(ลงชื่อ)..........................................................ผู้แจ้ง</div>
          <div className="p-sign-name">( {ticket.employee.fullName} )</div>
          <div>{ticket.employee.position}</div>
        </div>
        
        <div className="clearfix"></div>
        
        <table className="p-table">
          <tbody>
            <tr>
              <td>
                <div className="p-cell-container">
                  <div>
                    <span className="p-table-title">เรียน หผ.กส. กฟส.ระโนด</span>
                    <div className="p-table-content">ตรวจสอบข้อมูลเพื่อพิจารณาดำเนินการต่อไป</div>
                  </div>
                  <div className="p-table-bottom">
                    <div className="p-table-sign-row">(ลงชื่อ)......................................................</div>
                    <div className="p-table-sign-row">(..........................................................)</div>
                  </div>
                </div>
              </td>
              <td>
                <div className="p-cell-container">
                  <div>
                    <span className="p-table-title">คุณ............................................................</span>
                    <div className="p-table-content">ตรวจสอบและดำเนินการ</div>
                  </div>
                  <div className="p-table-bottom">
                    <div className="p-table-sign-row">(ลงชื่อ)......................................................</div>
                    <div className="p-table-sign-row">(..........................................................)</div>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div className="p-cell-container">
                  <div>
                    <span className="p-table-title">เรียน ผจก.กฟส.ระโนด ผ่าน.........................</span>
                    <div className="p-table-content">
                      ได้ดำเนินการตรวจสอบแล้วปรากฏว่า
                      <div className="p-dotted-line"></div>
                      <div className="p-dotted-line"></div>
                      <div className="p-dotted-line"></div>
                      <div className="p-dotted-line"></div>
                      <div className="p-dotted-line"></div>
                    </div>
                  </div>
                  <div className="p-table-bottom">
                    <div className="p-table-sign-row">(ลงชื่อ)............................................ช่างผู้ตรวจ</div>
                    <div className="p-table-sign-row">ตำแหน่ง.....................................................</div>
                  </div>
                </div>
              </td>
              <td>
                <div className="p-cell-container">
                  <div>
                    <span style={{ fontWeight: 'bold', display: 'block' }}>&#9744; อนุมัติในหลักการ</span>
                    <span style={{ fontWeight: 'bold', display: 'block', marginTop: '5px' }}>&#9744; ไม่อนุมัติ.....................................</span>
                  </div>
                  <div className="p-table-bottom">
                    <div className="p-table-sign-row">(ลงชื่อ)......................................................</div>
                    <div className="p-table-sign-row">(..........................................................)</div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}