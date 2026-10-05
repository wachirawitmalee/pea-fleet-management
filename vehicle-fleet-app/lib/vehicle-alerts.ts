type AlertVehicle = {
  plateNumber: string; currentMileage: number; nextCheckMileage: number | null;
  taxExpireDate: Date | string | null; nextCheckDate: Date | string | null;
};
const day = (date: Date | string) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(date));
  const part = (name: string) => Number(parts.find(p => p.type === name)!.value);
  return Date.UTC(part('year'), part('month') - 1, part('day')) / 86400000;
};
export function vehicleAlerts(vehicles: AlertVehicle[], now = new Date()) {
  const alerts: { plate: string; level: string; icon: string; message: string }[] = [];
  for (const v of vehicles) {
    const add = (level: string, icon: string, message: string) => alerts.push({ plate: v.plateNumber, level, icon, message: `รถทะเบียน ${v.plateNumber} ${message}` });
    for (const [date, limit, label] of [[v.taxExpireDate, 30, 'ต่อภาษี'], [v.nextCheckDate, 15, 'เช็คระยะตามวันที่']] as const) {
      if (!date) continue;
      const left = day(date) - day(now);
      if (left < 0) add('danger', '⛔', `เลยกำหนด${label} ${Math.abs(left)} วัน`);
      else if (left <= limit) add('warning', '📅', left === 0 ? `ถึงกำหนด${label}วันนี้` : `อีก ${left} วันถึงกำหนด${label}`);
    }
    if (v.nextCheckMileage !== null) {
      const left = v.nextCheckMileage - v.currentMileage;
      if (left <= 0) add('danger', '🔧', left === 0 ? 'ถึงกำหนดเช็คระยะตามเลขไมล์แล้ว' : `เกินกำหนดเช็คระยะ ${Math.abs(left).toLocaleString('th-TH')} กม.`);
      else if (left <= 1000) add('info', '🛠️', `อีก ${left.toLocaleString('th-TH')} กม. จะถึงกำหนดเช็คระยะ`);
    }
  }
  return alerts;
}
