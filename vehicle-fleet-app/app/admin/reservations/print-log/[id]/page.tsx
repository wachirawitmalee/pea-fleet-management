"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function PrintLogPage() {
  const params = useParams();
  const reservationId = params.id as string;
  const [reservation, setReservation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/reservations');
        if (res.ok) {
          const allRes = await res.json();
          const found = allRes.find((r: any) => r.reservationId === reservationId);
          setReservation(found);
        }
      } catch (error) { console.error("Error:", error); } finally { setIsLoading(false); }
    };
    fetchData();
  }, [reservationId]);

  useEffect(() => {
    if (reservation && !isLoading) { setTimeout(() => { window.print(); }, 800); }
  }, [reservation, isLoading]);

  if (isLoading) return <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>กำลังเตรียมเอกสาร...</div>;
  if (!reservation) return <div style={{ padding: '50px', textAlign: 'center', color: 'red', fontFamily: 'sans-serif' }}>ไม่พบข้อมูลบันทึก</div>;

  const log = reservation.logs || reservation.checkInOutLog;
  const fmtDateTime = (d: string | null) => d ? new Date(d).toLocaleString('th-TH') + ' น.' : '-';
  const mileageOut = log?.mileageOut || 0;
  const mileageIn = log?.mileageIn || 0;
  const distance = (mileageIn && mileageOut) ? (mileageIn - mileageOut) : 0;

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
        .p-box { border: 1px solid black; padding: 10px; margin-top: 5px; min-height: 60px; border-radius: 4px; font-weight: bold; font-size: 18px; line-height: 1.2; text-align: center; display: flex; align-items: center; justify-content: center;}
        
        .p-sign-block { margin-top: 20px; float: right; width: 280px; text-align: center; margin-right: 0px; }
        .p-sign-line { white-space: nowrap; margin-bottom: 5px; display: block; }
        .p-sign-name { font-weight: bold; margin-bottom: 5px; display: block; }
        .clearfix { clear: both; margin-bottom: 15px; }

        .p-table { width: 100%; border-collapse: collapse; margin-top: 15px; border: 1px solid black; table-layout: fixed; }
        .p-table td { border: 1px solid black; padding: 10px; height: 130px; vertical-align: top; width: 50%; position: relative; }
        .p-cell-container { display: flex; flex-direction: column; justify-content: space-between; height: 100%; }
        .p-table-title { font-weight: bold; display: block; margin-bottom: 5px; font-size: 18px; }
        .p-table-content { padding-left: 10px; line-height: 1.5; }
        .p-table-bottom { text-align: center; width: 100%; margin-bottom: 5px; }
        .p-table-sign-row { white-space: nowrap; margin-top: 15px; }

        /* กล่องรูปภาพเฉพาะหน้า Log */
        .p-photo-container { display: flex; justify-content: space-between; gap: 15px; margin-top: 10px; }
        .p-photo-col { width: 48%; border: 1px solid black; padding: 10px; text-align: center; border-radius: 4px;}
        .p-photo-box { width: 100%; height: 160px; border: 1px dashed #999; display: flex; align-items: center; justify-content: center; color: #999; margin-top: 10px; }
        .p-photo-img { max-height: 100%; max-width: 100%; object-fit: contain; }
      `}} />

      <div id="print-area">
        <div className="p-header">
          <img src="https://img2.pic.in.th/images9096612fa657aad5.png" className="p-logo" alt="PEA Logo" />
          <div style={{ textAlign: 'right' }}>
            <div><b>วันที่พิมพ์:</b> <span>{new Date().toLocaleDateString('th-TH')}</span></div>
          </div>
        </div>
        
        <div className="p-title">เอกสารบันทึกการใช้ยานพาหนะ (รับ-คืนรถ)</div>
        
        <div className="p-paragraph">
          <b>เรื่อง</b> &nbsp;รายงานการขออนุญาตใช้ยานพาหนะและการเดินทาง<br/>
          <b>เรียน</b> &nbsp;ผจก.กฟส.ระโนด<br/><br/>
          <span className="p-indent">ข้าพเจ้า</span><span className="p-val-inline" style={{ minWidth: '150px' }}>{reservation.employee.fullName}</span>&nbsp;ตำแหน่ง<span className="p-val-inline" style={{ minWidth: '100px' }}>{reservation.employee.position}</span>&nbsp;แผนก<span className="p-val-inline" style={{ minWidth: '100px' }}>{reservation.employee.department || '-'}</span>&nbsp;ได้ขออนุญาตใช้ยานพาหนะ ทะเบียน<span className="p-val-inline" style={{ minWidth: '100px' }}>{reservation.vehicle.plateNumber}</span>&nbsp;ยี่ห้อ<span className="p-val-inline" style={{ minWidth: '100px' }}>{reservation.vehicle.brand}</span>
          <br/><b>เพื่อเดินทางไปที่:</b> <span className="p-val-inline" style={{minWidth: '250px'}}>{reservation.destination}</span><br/>
          <b>วัตถุประสงค์:</b> <span className="p-val-inline" style={{minWidth: '250px'}}>{reservation.purpose || '-'}</span>
        </div>
        
        <div className="p-paragraph" style={{ marginTop: '10px' }}>
          <b>รายละเอียดการเดินทางและเลขไมล์ (กิโลเมตร)</b><br/>
          <span className="p-indent">เวลาออกเดินทาง:</span> <span className="p-val-inline" style={{minWidth: '150px'}}>{fmtDateTime(log?.checkInTime)}</span> &nbsp;เลขไมล์หน้าปัด: <span className="p-val-inline" style={{minWidth: '100px'}}>{mileageOut.toLocaleString()}</span> กม.<br/>
          <span className="p-indent">เวลาเดินทางกลับ:</span> <span className="p-val-inline" style={{minWidth: '150px'}}>{fmtDateTime(log?.checkOutTime)}</span> &nbsp;เลขไมล์หน้าปัด: <span className="p-val-inline" style={{minWidth: '100px'}}>{mileageIn > 0 ? mileageIn.toLocaleString() : '-'}</span> กม.<br/>
          <div style={{ marginTop: '10px', fontSize: '18px' }}>
            <span className="p-indent"><b>รวมระยะทางที่ใช้ในการปฏิบัติงานทั้งสิ้น:</b></span> <span className="p-val-inline" style={{minWidth: '150px', fontSize: '20px'}}>{distance.toLocaleString()}</span> <b>กิโลเมตร</b>
          </div>
        </div>

        <div className="p-photo-container">
          <div className="p-photo-col">
            <b>ภาพหน้าปัดรถขาไป (Check-in)</b>
            <div className="p-photo-box">
              {log?.photoOutUrl ? <img src={log.photoOutUrl} className="p-photo-img" /> : 'ไม่มีภาพถ่าย'}
            </div>
          </div>
          <div className="p-photo-col">
            <b>ภาพหน้าปัดรถขากลับ (Check-out)</b>
            <div className="p-photo-box">
              {log?.photoInUrl ? <img src={log.photoInUrl} className="p-photo-img" /> : 'ไม่มีภาพถ่าย'}
            </div>
          </div>
        </div>

        <div className="p-paragraph" style={{ marginTop: '10px' }}>
          <b>หมายเหตุ (การรายงานความผิดปกติของรถ):</b> <span className="p-val-inline" style={{minWidth: '300px'}}>{log?.remark || '-'}</span>
        </div>
        
        <div className="clearfix"></div>
        
        <table className="p-table">
          <tbody>
            <tr>
              <td>
                <div className="p-cell-container">
                  <div>
                    <span className="p-table-title">รับรองการใช้ยานพาหนะ</span>
                    <div className="p-table-content">ขอรับรองว่าการใช้งานเป็นไปเพื่อปฏิบัติราชการจริง</div>
                  </div>
                  <div className="p-table-bottom">
                    <div className="p-table-sign-row">(ลงชื่อ)...................................................... ผู้ใช้รถ</div>
                    <div className="p-table-sign-row">( {reservation.employee.fullName} )</div>
                    <div className="p-table-sign-row">วันที่ ......../......../........</div>
                  </div>
                </div>
              </td>
              <td>
                <div className="p-cell-container">
                  <div>
                    <span className="p-table-title">เรียน หผ.กส. / ผจก.กฟส.ระโนด</span>
                    <div className="p-table-content">เพื่อโปรดทราบและตรวจสอบบันทึกการเดินทาง</div>
                  </div>
                  <div className="p-table-bottom">
                    <div className="p-table-sign-row">(ลงชื่อ)...................................................... ผู้ตรวจสอบ</div>
                    <div className="p-table-sign-row">(..........................................................)</div>
                    <div className="p-table-sign-row">วันที่ ......../......../........</div>
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