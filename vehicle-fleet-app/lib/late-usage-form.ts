import Swal from 'sweetalert2';
import { preparePhoto } from './prepare-photo';
import { thaiDay } from './booking-status';

export async function lateUsageForm(booking: { reservationId: string; startDate: string; startTime: string; overdueReturnCount?: number }) {
  const today = thaiDay(new Date());
  const style = 'width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:10px;margin:6px 0 14px;color:#0f172a';
  const { value } = await Swal.fire({
    titleText: 'บันทึกการใช้รถจริงของวันนี้',
    html: `<div style="text-align:left;color:#334155">
      <p>ใช้สำหรับนำรถไปใช้งานแล้วแต่ลืมบันทึก ระบบจะตรวจไม่ให้เวลาทับกับคิวหรือประวัติอื่น</p>
      ${booking.overdueReturnCount ? '<label style="display:block;padding:12px;background:#fff7ed"><input id="late-handover" type="checkbox" /> ฉันยืนยันว่าได้รับรถคืนมาจริงแล้วก่อนนำไปใช้ รายการเก่าที่ยังไม่บันทึกคืนจะเก็บไว้ให้แอดมินตรวจสอบ</label>' : ''}
      <label>รหัสพนักงานผู้จอง *</label><input id="late-employee" style="${style}" inputmode="numeric" />
      <label>เวลารับรถจริง *</label><input id="late-start" style="${style}" type="datetime-local" min="${today}T00:00" max="${today}T23:59" value="${today}T${booking.startTime}" />
      <label>เลขไมล์ตอนนำรถออก *</label><input id="late-mileage" style="${style}" type="number" min="0" step="1" />
      <label>สถานะการใช้รถ</label><select id="late-returned" style="${style}"><option value="no">ยังใช้งานอยู่</option><option value="yes">คืนรถแล้ว</option></select>
      <div id="late-end-fields" hidden><label>เวลาคืนรถจริง *</label><input id="late-end" style="${style}" type="datetime-local" min="${today}T00:00" max="${today}T23:59" />
      <label>เลขไมล์ตอนคืนรถ *</label><input id="late-mileage-in" style="${style}" type="number" min="0" step="1" /></div>
      <label>รูปหน้าปัด — ถ่ายรูปหรือเลือกจากอัลบั้ม</label><input id="late-photo" style="${style}" type="file" accept="image/*" />
      <label>หมายเหตุ</label><textarea id="late-note" style="${style}" placeholder="เหตุผลที่บันทึกล่าช้า"></textarea></div>`,
    confirmButtonText: 'บันทึกการใช้งานจริง', showCancelButton: true, cancelButtonText: 'ยกเลิก', showLoaderOnConfirm: true,
    didOpen: () => { document.getElementById('late-returned')!.onchange = () => { document.getElementById('late-end-fields')!.hidden = (document.getElementById('late-returned') as HTMLSelectElement).value !== 'yes'; }; },
    preConfirm: async () => {
      const get = (id: string) => (document.getElementById(id) as HTMLInputElement).value;
      const returned = get('late-returned') === 'yes';
      if (!get('late-employee') || !get('late-start') || !get('late-mileage') || (returned && (!get('late-end') || !get('late-mileage-in')))) return Swal.showValidationMessage('กรุณากรอกข้อมูลที่จำเป็นให้ครบ');
      try {
        const file = (document.getElementById('late-photo') as HTMLInputElement).files?.[0];
        const response = await fetch('/api/check-in-out', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          confirmPreviousReturned: (document.getElementById('late-handover') as HTMLInputElement | null)?.checked === true,
          type: 'LATE', reservationId: booking.reservationId, employeeId: get('late-employee').trim(), actualStart: get('late-start'),
          actualEnd: get('late-end'), mileage: get('late-mileage'), mileageIn: get('late-mileage-in'), returned,
          photoUrl: file ? await preparePhoto(file) : '', remark: get('late-note'),
        }) });
        const data = await response.json();
        if (!response.ok) return Swal.showValidationMessage(data.error || 'บันทึกไม่สำเร็จ');
        return true;
      } catch { return Swal.showValidationMessage('บันทึกไม่สำเร็จ กรุณาตรวจสอบข้อมูลและรูปภาพ แล้วลองใหม่'); }
    },
  });
  return value === true;
}
