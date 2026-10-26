import Swal from 'sweetalert2';

export async function cancelBooking(reservationId: string): Promise<boolean> {
  const result = await Swal.fire({
    title: 'ยืนยันยกเลิกการจอง',
    text: 'กรอกรหัสพนักงานของผู้จองอีกครั้งเพื่อยืนยัน เมื่อยกเลิกแล้วผู้อื่นจะจองช่วงเวลานี้ได้',
    input: 'text', inputLabel: 'รหัสพนักงานผู้จอง',
    inputAttributes: { inputmode: 'numeric', autocomplete: 'off' },
    showCancelButton: true, confirmButtonText: 'ยืนยันยกเลิกการจอง', cancelButtonText: 'กลับ',
    confirmButtonColor: '#dc2626', showLoaderOnConfirm: true,
    allowOutsideClick: () => !Swal.isLoading(),
    preConfirm: async (value: string) => {
      if (!value?.trim()) { Swal.showValidationMessage('กรุณากรอกรหัสพนักงานผู้จอง'); return false; }
      try {
        const response = await fetch('/api/reservations', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reservationId, reservationStatus: 'CANCELLED', employeeId: value.trim() }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'ยกเลิกไม่สำเร็จ');
        return true;
      } catch (error) { Swal.showValidationMessage(error instanceof Error ? error.message : 'ติดต่อระบบไม่สำเร็จ'); return false; }
    },
  });
  if (!result.isConfirmed || result.value !== true) return false;
  await Swal.fire({ icon: 'success', title: 'ยกเลิกการจองแล้ว', text: 'เก็บประวัติรายการไว้ และเปิดช่วงเวลาให้จองใหม่ได้' });
  return true;
}
