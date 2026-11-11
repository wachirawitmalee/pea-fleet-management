import type { ReactNode } from 'react';

export default function InspectionLayout({ children }: { children: ReactNode }) {
  return <>
    {process.env.NODE_ENV === 'development' && process.env.FLEET_LOCAL_PREVIEW === 'true' && <p className="bg-amber-100 px-4 py-2 text-center text-sm font-bold text-amber-950">ข้อมูลตัวอย่าง · บันทึกได้เฉพาะในเครื่อง ไม่ส่ง Teams</p>}
    {process.env.NODE_ENV === 'development' && process.env.FLEET_READ_ONLY === 'true' && (
      <p role="note" className="bg-violet-100 px-4 py-2 text-center text-sm font-semibold text-violet-950">
        ตัวอย่างบน localhost · อ่านข้อมูลจริงได้ แต่ปิดการบันทึกเพื่อให้ทดลองได้โดยไม่กระทบระบบจริง
      </p>
    )}
    {children}
  </>;
}
