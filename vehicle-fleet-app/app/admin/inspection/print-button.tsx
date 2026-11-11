'use client';
export default function PrintButton() {
  return <button type="button" onClick={()=>window.print()} className="rounded-xl bg-indigo-700 px-4 py-2 font-bold text-white print:hidden">พิมพ์ / บันทึก PDF</button>;
}
