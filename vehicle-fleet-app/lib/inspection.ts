export const vehicleChecks = {
  'รถยนต์': ['เข็มขัดนิรภัย','ไฟส่องสว่าง','ไฟเบรก','ไฟสัญญาณ','กระจก','ที่ปัดน้ำฝน','น้ำฉีดกระจก','น้ำมันเชื้อเพลิง','น้ำมันเครื่อง','แตร','เบรก','แอร์','ยาง/ล้อ','ถังดับเพลิง','แบตเตอรี่','ความสะอาด','ความเสียหายภายใน','ความเสียหายภายนอก'],
  'เครน': ['น้ำมันเครื่อง','น้ำหล่อเย็น','ไฮดรอลิก','เกียร์','แบตเตอรี่','ยาง','งายก','เชื้อเพลิง','เกจ','ระบบไฮดรอลิก','บังคับเลี้ยว/เบรก','เครื่องยนต์','ไฟ','แตร','ไฟสัญญาณ','เสียงถอย','โซ่','น็อตล็อกดอกสว่าน'],
  'โฟล์คลิฟท์': ['ประเภท (ไฟฟ้า/น้ำมัน)','ระบบไฟฟ้า','ระบบเครื่องกล','ระบบคอนโทรล','เกียร์','ปั๊มไฮดรอลิค','สายไฮดรอลิค','น้ำมันไฮดรอลิค','PTO','กระบอกต่างๆ','เสาเครน','วิ้นซ์','สลิง','รอก','ฮุก','ไฟสัญญาณ','เกจชั่วโมง'],
} as const;
export type VehicleCategory = keyof typeof vehicleChecks;
export type InspectionKind = 'vehicle' | 'pre-job';
export const workerChecks = ['สวมเครื่องแบบ กฟภ.','ร่างกายพร้อม','อุปกรณ์ PPE'] as const;
export const jobVehicleChecks = ['มีการตรวจยานพาหนะ (FM1-SOH3-S04-6103)','มีการตรวจรถยก (FM1-SOH3-S04-6104)','มีการตรวจเครนไฮดรอลิค (FM1-SOH3-S04-6105)'] as const;
export const toolChecks = ['อุปกรณ์สื่อสาร','เครื่องมือปฏิบัติงาน'] as const;
export function thaiInspectionDay(now = new Date()) {
  return new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);
}
export function categoryFor(type: string | null | undefined): VehicleCategory {
  if (/โฟล์ค|ฟอร์ค|รถยก|forklift/i.test(type ?? '')) return 'โฟล์คลิฟท์';
  if (/เครน|crane/i.test(type ?? '')) return 'เครน';
  return 'รถยนต์';
}
export function inspectionDayValid(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value <= thaiInspectionDay();
}
export type InspectionRow = {
  id: string; kind: InspectionKind; date: string; vehicleId: string; plate: string; category: VehicleCategory;
  createdAt: string; ready: boolean; failures: string[]; approval: 'pending' | 'approved' | 'rejected' | null;
};
export type InspectionDetail = InspectionRow & {
  inspector: { id: string; name: string; position: string; department: string };
  photoId?: string; answers: unknown; note: string;
  decision?: { by: string; at: string; note: string };
};
