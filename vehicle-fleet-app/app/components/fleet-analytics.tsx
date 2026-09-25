"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { FleetAnalytics } from '@/lib/analytics';
const fmt = (n: number | null) => n === null ? '—' : n.toLocaleString('th-TH', { maximumFractionDigits: 2 });
export default function FleetAnalyticsPanel({ data }: { data: FleetAnalytics }) {
  const cards = [
    { label: 'ค่าเติมน้ำมัน', value: fmt(data.fuelCost), unit: 'บาท', detail: `${data.fuelEntries} รายการเติม` },
    { label: 'ปริมาณน้ำมันที่เติม', value: fmt(data.liters), unit: 'ลิตร', detail: `ราคาเฉลี่ย ${fmt(data.averagePrice)} บาท/ลิตร` },
    { label: 'ระยะทางที่บันทึก', value: fmt(data.distance), unit: 'กม.', detail: `คืนรถแล้ว ${data.trips} เที่ยว • ใช้รถ ${data.activeVehicles} คัน` },
    { label: 'ค่าซ่อมตามเดือนแจ้งซ่อม', value: fmt(data.maintenanceCost), unit: 'บาท', detail: `งานซ่อมค้างทั้งหมด ${data.openRepairs} รายการ` },
  ];
  return <section aria-label="วิเคราะห์น้ำมันและค่าใช้จ่าย" className="space-y-6">
    <div><h2 className="text-2xl font-extrabold text-slate-800">น้ำมัน ระยะทาง และค่าซ่อม</h2><p className="text-sm text-slate-500 mt-2">ข้อมูลเดือน {data.month} ตามเวลาไทย • ค่าเติมน้ำมัน{data.fuelCostChange === null ? 'ยังไม่มีฐานเปรียบเทียบเดือนก่อน' : ` ${data.fuelCostChange >= 0 ? 'เพิ่มขึ้น' : 'ลดลง'} ${fmt(Math.abs(data.fuelCostChange))}% เทียบกับยอดทั้งเดือนก่อน`}</p></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{cards.map(card => <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"><p className="text-sm font-bold text-slate-500">{card.label}</p><p className="text-3xl font-extrabold text-indigo-900 mt-3">{card.value} <span className="text-sm font-medium">{card.unit}</span></p><p className="text-xs text-slate-500 mt-3">{card.detail}</p></div>)}</div>
    <div className="bg-white p-5 sm:p-7 rounded-2xl border border-slate-200">
      <h3 className="font-bold text-slate-800 mb-5">แนวโน้มค่าใช้จ่าย 6 เดือน (บาท)</h3>
      {data.months.some(m => m.fuelCost || m.maintenanceCost) ? <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.months} margin={{ left: 5, right: 8 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis width={65} tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Bar dataKey="fuelCost" name="ค่าเติมน้ำมัน" fill="#6366f1" radius={[4, 4, 0, 0]} /><Bar dataKey="maintenanceCost" name="ค่าซ่อมตามเดือนแจ้ง" fill="#f59e0b" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <p className="py-14 text-center text-slate-500">ยังไม่มีรายการค่าใช้จ่ายในช่วง 6 เดือนนี้</p>}
    </div>
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <h3 className="font-bold text-slate-800 p-5">ค่าใช้จ่ายรายคัน เรียงตามค่าเติมน้ำมัน</h3>
      <div className="overflow-x-auto"><table className="w-full text-sm text-left whitespace-nowrap"><thead className="bg-slate-50 text-slate-600"><tr>{['ทะเบียน', 'เที่ยวที่คืนแล้ว', 'ระยะทาง (กม.)', 'น้ำมัน (ลิตร)', 'ค่าเติม (บาท)', 'ค่าซ่อม (บาท)', 'ค่าเติม/กม.*'].map(label => <th key={label} className="px-5 py-3 font-semibold">{label}</th>)}</tr></thead><tbody>{data.vehicles.map(v => <tr key={v.vehicleId} className="border-t border-slate-100"><th className="px-5 py-4 text-slate-800">{v.plateNumber}</th>{[v.trips, v.distance, v.liters, v.fuelCost, v.maintenanceCost, v.fuelCostPerKm].map((value, i) => <td key={i} className="px-5 py-4 text-slate-600">{fmt(value)}</td>)}</tr>)}{!data.vehicles.length && <tr><td colSpan={7} className="p-8 text-center text-slate-500">ยังไม่มีข้อมูลรถยนต์</td></tr>}</tbody></table></div>
      <p className="p-5 text-xs leading-relaxed text-slate-500">* ค่าเติมน้ำมันหารด้วยระยะทางที่คืนรถในเดือนเดียวกัน เป็นค่าใช้จ่ายโดยประมาณ ไม่ใช่อัตราสิ้นเปลืองจริง เพราะน้ำมันอาจใช้ข้ามเดือน ค่าซ่อมไม่รวมรายการยกเลิกและรายการที่ยังไม่ระบุราคา</p>
      {data.invalidTrips > 0 && <p role="status" className="px-5 pb-5 text-sm text-amber-700">มี {data.invalidTrips} เที่ยวที่เลขไมล์ไม่ครบหรือผิดปกติ จึงไม่นำมารวมระยะทาง</p>}
    </div>
  </section>;
}
