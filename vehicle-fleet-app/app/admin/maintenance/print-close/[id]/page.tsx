"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function PrintCloseTicketPage() {
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
          const foundTicket = allTickets.find((t: any) => t.ticketId === ticketId);
          setTicket(foundTicket);
        }
      } catch (error) { console.error("Error:", error); } finally { setIsLoading(false); }
    };
    fetchTicketData();
  }, [ticketId]);

  useEffect(() => {
    if (ticket && !isLoading) { setTimeout(() => { window.print(); }, 800); }
  }, [ticket, isLoading]);

  if (isLoading) return <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>กำลังเตรียมเอกสาร...</div>;
  if (!ticket) return <div style={{ padding: '50px', textAlign: 'center', color: 'red', fontFamily: 'sans-serif' }}>ไม่พบข้อมูลใบแจ้งซ่อม</div>;

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('th-TH') : '-';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        /* โหลดไฟล์ฟอนต์ 'THSarabunNew' (.ttf) แบบเดียวกับหน้าแจ้งซ่อม */
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

        @media print {
          @page { size: A4; margin: 0; }
          body { background: white; display: block; }
          #print-area { margin: 0; box-shadow: none; position: absolute; left: 0; top: 0; height: 296mm; overflow: hidden; }
        }

        /* รูปแบบคลาสเดียวกันทั้งหมด */
        .p-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px; }
        .p-logo { width: 2.2cm; height: auto; }
        .p-title { text-align: center; font-weight: bold; font-size: 22px; margin-bottom: 15px; }
        .p-paragraph { text-align: justify; text-justify: distribute-all-lines; margin-bottom: 8px; width: 100%; display: block; line-height: 1.6; }
        .p-val-inline { display: inline-block; border-bottom: 1px dotted #000; padding: 0 5px; text-align: center; min-width: 50px; font-weight: bold; line-height: 1.4; margin: 0 2px; }
        .p-indent { margin-left: 1.5cm; }
        .p-box { border: 1px solid black; padding: 10px; margin-top: 5px; min-height: 60px; border-radius: 4px; font-weight: bold; font-size: 18px; line-height: 1.2; }
        
        .p-sign-block { margin-top: 20px; float: right; width: 280px; text-align: center; margin-right: 0px; }
        .p-sign-line { white-space: nowrap; margin-bottom: 5px; display: block; }
        .p-sign-name { font-weight: bold; margin-bottom: 5px; display: block; }
        .clearfix { clear: both; margin-bottom: 15px; }

        .p-table { width: 100%; border-collapse: collapse; margin-top: 15px; border: 1px solid black; table-layout: fixed; }
        .p-table td { border: 1px solid black; padding: 10px; height: 140px; vertical-align: top; width: 50%; position: relative; }
        .p-cell-container { display: flex; flex-direction: column; justify-content: space-between; height: 100%; }
        .p-table-title { font-weight: bold; display: block; margin-bottom: 5px; font-size: 18px; }
        .p-table-content { padding-left: 10px; line-height: 1.5; }
        .p-table-bottom { text-align: center; width: 100%; margin-bottom: 5px; }
        .p-table-sign-row { white-space: nowrap; margin-top: 15px; }
      `}} />

      <div id="print-area">
        <div className="p-header">
          <img src="https://img2.pic.in.th/images9096612fa657aad5.png" className="p-logo" alt="PEA Logo" />
          <div style={{ textAlign: 'right' }}>
            <div><b>อ้างอิงใบแจ้งซ่อมเลขที่:</b> <span>{ticket.ticketNumber}</span></div>
            <div><b>วันที่พิมพ์:</b> <span>{new Date().toLocaleDateString('th-TH')}</span></div>
          </div>
        </div>
        
        <div className="p-title">เอกสารสรุปผลและปิดงานซ่อมบำรุงยานพาหนะ</div>
        
        <div className="p-paragraph">
          <b>เรื่อง</b> &nbsp;รายงานสรุปผลการซ่อมแซมยานพาหนะทะเบียน<span className="p-val-inline" style={{minWidth: '100px'}}>{ticket.vehicle.plateNumber}</span><br/>
          <b>เรียน</b> &nbsp;ผจก.กฟส.ระโนด ผ่าน หผ.กส.<br/><br/>
          <span className="p-indent">ตามที่</span><span className="p-val-inline" style={{ minWidth: '150px' }}>{ticket.employee.fullName}</span>&nbsp;ตำแหน่ง<span className="p-val-inline" style={{ minWidth: '100px' }}>{ticket.employee.position}</span>&nbsp;ได้แจ้งความประสงค์ขอซ่อมยานพาหนะ ทะเบียน<span className="p-val-inline" style={{ minWidth: '80px' }}>{ticket.vehicle.plateNumber}</span>&nbsp;เมื่อวันที่<span className="p-val-inline" style={{ minWidth: '80px' }}>{fmtDate(ticket.requestDate)}</span>&nbsp;เนื่องจากพบปัญหาขัดข้องนั้น บัดนี้การดำเนินการซ่อมบำรุงได้เสร็จสิ้นเรียบร้อยแล้ว โดยมีรายละเอียดดังต่อไปนี้
        </div>
        
        <div className="p-paragraph" style={{ marginTop: '10px' }}>
          <b>๑. ร้านค้า / อู่ที่ดำเนินการซ่อม:</b> <span className="p-val-inline" style={{minWidth: '250px'}}>{ticket.shop?.shopName || ticket.shopName || '-'}</span><br/>
          <b>๒. เลขที่เอกสาร PR:</b> <span className="p-val-inline" style={{minWidth: '120px'}}>{ticket.prNo || '-'}</span> &nbsp;&nbsp;&nbsp;<b>ลงวันที่:</b> <span className="p-val-inline" style={{minWidth: '100px'}}>{fmtDate(ticket.prDate)}</span><br/>
          <b>๓. เลขที่เอกสาร PO:</b> <span className="p-val-inline" style={{minWidth: '120px'}}>{ticket.poNo || '-'}</span> &nbsp;&nbsp;&nbsp;<b>ลงวันที่:</b> <span className="p-val-inline" style={{minWidth: '100px'}}>{fmtDate(ticket.poDate)}</span><br/>
          <b>๔. ค่าใช้จ่ายรวมทั้งสิ้น:</b> <span className="p-val-inline" style={{minWidth: '150px', fontSize: '18px'}}>{ticket.cost ? ticket.cost.toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}</span> <b>บาท</b><br/>
          <b>๕. วันที่นำรถเข้าซ่อม:</b> <span className="p-val-inline" style={{minWidth: '100px'}}>{fmtDate(ticket.entryDate)}</span> &nbsp;&nbsp;&nbsp;<b>วันที่ซ่อมเสร็จ:</b> <span className="p-val-inline" style={{minWidth: '100px'}}>{fmtDate(ticket.finishDate)}</span>
        </div>

        <div style={{ marginTop: '10px' }}><b>๖. ผลการดำเนินการซ่อมแซม / รายการอะไหล่ที่เปลี่ยน:</b></div>
        <div className="p-box" style={{ minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          {ticket.result || '-'}
        </div>
        
        <div style={{ marginTop: '10px' }}><b>๗. การจัดการอะไหล่เดิมที่ชำรุด (ส่งคืนพัสดุ):</b></div>
        <div className="p-box" style={{ minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          {ticket.adminNote || '-'}
        </div>
        
        <div className="clearfix"></div>
        
        <table className="p-table">
          <tbody>
            <tr>
              <td>
                <div className="p-cell-container">
                  <div>
                    <span className="p-table-title">ผู้ตรวจรับการซ่อมแซม</span>
                    <div className="p-table-content">ได้ตรวจสอบรถยนต์แล้วพบว่า ใช้งานได้ตามปกติ</div>
                  </div>
                  <div className="p-table-bottom">
                    <div className="p-table-sign-row">(ลงชื่อ)......................................................</div>
                    <div className="p-table-sign-row">(..........................................................)</div>
                    <div className="p-table-sign-row">วันที่ ......../......../........</div>
                  </div>
                </div>
              </td>
              <td>
                <div className="p-cell-container">
                  <div>
                    <span className="p-table-title">เรียน ผจก.กฟส.ระโนด</span>
                    <div className="p-table-content">เพื่อโปรดพิจารณาอนุมัติการเบิกจ่ายและปิดงาน</div>
                  </div>
                  <div className="p-table-bottom">
                    <div className="p-table-sign-row">(ลงชื่อ)......................................................</div>
                    <div className="p-table-sign-row">(..........................................................)</div>
                    <div className="p-table-sign-row">วันที่ ......../......../........</div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: '15px', textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }}>
          สถานะใบงานในระบบ: <span style={{ border: '2px solid black', padding: '2px 15px', borderRadius: '4px' }}>{ticket.status}</span>
        </div>
      </div>
    </>
  );
}