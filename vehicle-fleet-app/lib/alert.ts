import Swal from 'sweetalert2';

// 1. ฟังก์ชันเรียก Loading Spinner
export const showLoading = (title = 'กำลังประมวลผล...', text = 'กรุณารอสักครู่ ระบบกำลังอัปเดตข้อมูล') => {
  Swal.fire({
    title: title,
    html: text,
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });
};

// 2. ฟังก์ชันเรียกป๊อบอัพสำเร็จ (Success)
export const showSuccess = (title = 'สำเร็จ!', text = '') => {
  return Swal.fire({
    icon: 'success',
    title: title,
    text: text,
    showConfirmButton: false,
    timer: 1500,
    customClass: { popup: 'rounded-[2rem]' }
  });
};

// 3. ฟังก์ชันเรียกป๊อบอัพผิดพลาด (Error)
export const showError = (title = 'เกิดข้อผิดพลาด', text = 'ไม่สามารถทำรายการได้ กรุณาลองใหม่อีกครั้ง') => {
  return Swal.fire({
    icon: 'error',
    title: title,
    text: text,
    confirmButtonColor: '#9333ea',
    customClass: { popup: 'rounded-[2rem]' }
  });
};