import { createHash, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { googleCall, GoogleStorageError } from '@/lib/storage/google';
import { parseMileage } from '@/lib/vehicle-mileage';
import { categoryFor, inspectionDayValid, jobVehicleChecks, toolChecks, vehicleChecks, workerChecks, type InspectionDetail, type InspectionRow } from '@/lib/inspection';

const response = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
const error = (message: string, status = 400) => response({ error: message }, status);
const clean = (v: unknown, max = 600) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const digest = (s: string) => createHash('sha256').update(s).digest();
const idFormat = /^[\w-]{1,100}$/;
const count = (value: unknown) => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 1000;
const employeeSelect = { employeeId: true, fullName: true, department: true, position: true, status: true };
async function actor(request: Request) {
  const id = request.headers.get('x-inspection-employee') ?? '';
  const key = request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_-]{32,128})$/)?.[1];
  if (!key || !idFormat.test(id)) return null;
  const keys = JSON.parse(process.env.INSPECTION_ACCESS_KEYS || '{}') as Record<string, { sha256: string; role: string }>;
  if (!Object.hasOwn(keys, id)) return null;
  const entry = keys[id];
  if (!entry || !/^[a-f0-9]{64}$/.test(entry.sha256) || !timingSafeEqual(digest(key), Buffer.from(entry.sha256, 'hex'))) return null;
  const employee = await prisma.employee.findUnique({ where: { employeeId: id }, select: employeeSelect });
  return employee?.status === 'ACTIVE' ? { ...employee, role: entry.role } : null;
}
function checks(value: unknown, labels: readonly string[]) {
  if (!Array.isArray(value) || value.length !== labels.length) return null;
  const normalized = labels.map((label, index) => {
    const item = value[index];
    return { label, status: item?.status, note: clean(item?.note), pass: item?.pass, fail: item?.fail };
  });
  if (normalized.some(x => !['pass', 'fail'].includes(x.status) || (x.status === 'fail' && !x.note))) return null;
  return normalized;
}
function failed(e: unknown) {
  if (e instanceof GoogleStorageError && e.code === 'CONFLICT') return error('รายการนี้ถูกดำเนินการแล้ว กรุณาโหลดข้อมูลใหม่', 409);
  console.error('Inspection request failed', e instanceof GoogleStorageError ? e.code : 'INTERNAL');
  return error('ระบบบันทึกผลตรวจยังไม่พร้อม กรุณาลองใหม่', 503);
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const mode = params.get('mode');
    if (mode === 'lookup') {
      const q = clean(params.get('q'), 80).toLocaleLowerCase('th');
      if (q.length < 2) return response([]);
      if (params.get('entity') === 'employee') {
        const employees = await prisma.employee.findMany({ where: { status: 'ACTIVE' }, select: { employeeId: true, fullName: true } });
        return response(employees.filter(e => e.employeeId.includes(q) || e.fullName.toLocaleLowerCase('th').includes(q)).slice(0, 12).map(e => ({ id: e.employeeId, label: e.fullName })));
      }
      const vehicles = await prisma.vehicle.findMany({ select: { vehicleId: true, plateNumber: true, brand: true, type: true } });
      return response(vehicles.filter(v => (v.plateNumber + ' ' + v.brand).toLocaleLowerCase('th').includes(q)).slice(0, 12).map(v => ({ id: v.vehicleId, label: v.plateNumber + ' · ' + v.brand, category: categoryFor(v.type) })));
    }
    if (mode === 'photo' || mode === 'detail') {
      const user = await actor(request);
      if (!user || !['manager','approver'].includes(user.role)) return error('กรุณายืนยันสิทธิ์ดูผลตรวจ', 401);
      const id = params.get('id');
      if (!id || !idFormat.test(id)) return error('รหัสรายการไม่ถูกต้อง');
      if (mode === 'photo') {
        const pic = await googleCall<{ mime: string; data: string }>('inspection-photo', { id });
        if (!/^image\/(jpeg|png|webp)$/.test(pic.mime)) return error('ไม่พบภาพ', 404);
        return new Response(new Uint8Array(Buffer.from(pic.data, 'base64')), { headers: { 'Content-Type': pic.mime, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
      }
      const record = await googleCall<InspectionDetail | null>('inspection-detail', { id });
      if (!record) return error('ไม่พบรายการตรวจ', 404);
      const { photoId, ...detail } = record;
      return response({ ...detail, hasPhoto: !!photoId, canApprove: user.role === 'approver' && user.employeeId !== record.inspector.id });
    }
    const period = params.get('period');
    if (!period || !/^\d{4}-\d{2}(-\d{2})?$/.test(period)) return error('เลือกวันหรือเดือนที่ต้องการดู');
    const [rows, vehicles] = await Promise.all([
      googleCall<InspectionRow[]>('inspection-summary', { period }),
      prisma.vehicle.findMany({ select: { vehicleId: true, plateNumber: true, type: true } }),
    ]);
    return response({ rows, vehicles: vehicles.map(v => ({ id: v.vehicleId, plate: v.plateNumber, category: categoryFor(v.type) })) });
  } catch (e) { return failed(e); }
}

export async function POST(request: Request) {
  try {
    const b = await request.json();
    if (!b || typeof b !== 'object') return error('ข้อมูลไม่ถูกต้อง');
    if (b.action === 'decide') {
      const user = await actor(request);
      if (user?.role !== 'approver') return error('เฉพาะผู้อนุมัติที่ยืนยันตัวตนแล้ว', 403);
      const id = clean(b.id, 100), note = clean(b.note);
      if (!idFormat.test(id) || !['approved','rejected'].includes(b.decision) || (b.decision === 'rejected' && !note)) return error('กรุณาระบุผลและเหตุผลหากไม่อนุญาต');
      if (b.decision === 'approved') {
        const record = await googleCall<InspectionDetail | null>('inspection-detail', { id });
        if (!record?.ready) return error('อนุญาตไม่ได้เมื่อผลตรวจยังมีปัญหา', 409);
      }
      await googleCall('inspection-decide', { id, decision: b.decision, by: user.employeeId, note });
      return response({ ok: true });
    }
    const { kind, date, id } = b;
    if (!['vehicle','pre-job'].includes(kind) || !inspectionDayValid(date) || typeof id !== 'string' || !/^[0-9a-f-]{36}$/.test(id)) return error('ประเภทหรือวันที่ตรวจไม่ถูกต้อง');
    const [vehicle, inspector] = await Promise.all([
      prisma.vehicle.findUnique({ where: { vehicleId: clean(b.vehicleId, 100) } }),
      prisma.employee.findUnique({ where: { employeeId: clean(b.inspectorId, 100) }, select: employeeSelect }),
    ]);
    if (!vehicle || inspector?.status !== 'ACTIVE') return error('กรุณาเลือกรถและผู้ตรวจจากข้อมูลระบบ');
    const category = categoryFor(vehicle.type);
    const photo = b.photo || null;
    if (photo && (typeof photo !== 'string' || photo.length > 3000000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo))) return error('ไฟล์ภาพไม่ถูกต้อง');
    const note = clean(b.note);
    let failures: string[], answers: unknown, ready: boolean;
    if (kind === 'vehicle') {
      const items = checks(b.items, vehicleChecks[category]), mileage = parseMileage(b.mileage);
      if (!items || mileage === null) return error('ระบุเลขไมล์และผลตรวจทุกข้อ พร้อมสาเหตุของข้อผิดปกติ');
      if (category !== 'โฟล์คลิฟท์' && !photo) return error('กรุณาแนบภาพหลักฐาน');
      failures = items.filter(x => x.status === 'fail').map(x => x.label);
      ready = failures.length === 0;
      answers = { items, mileage };
    } else {
      const supervisor = await prisma.employee.findUnique({ where: { employeeId: clean(b.supervisorId, 100) }, select: employeeSelect });
      const tasks = [clean(b.tasks?.[0]), clean(b.tasks?.[1]), clean(b.tasks?.[2])].filter(Boolean);
      const people = checks(b.people, workerChecks), tools = checks(b.tools, toolChecks);
      const counts = [b.male, b.female, b.absent];
      const carReason = clean(b.carReason), carAction = clean(b.carAction);
      if (supervisor?.status !== 'ACTIVE' || !clean(b.tasks?.[0]) || !people || !tools || !counts.every(count) ||
          !people.every(x => count(x.pass) && count(x.fail) && x.pass + x.fail === b.male + b.female && (x.fail > 0) === (x.status === 'fail')) ||
          !Array.isArray(b.vehicleChecks) || b.vehicleChecks.length !== jobVehicleChecks.length || !b.vehicleChecks.every((x: unknown) => typeof x === 'boolean') ||
          typeof b.carReady !== 'boolean' || (!b.carReady && (!carReason || !carAction)) || (tools[1].status === 'fail' && !clean(b.toolAction))) return error('กรอกงาน ผู้ควบคุมงาน จำนวนคน ผลตรวจ และการแก้ไขให้ครบ');
      failures = [...people, ...tools].filter(x => x.status === 'fail').map(x => x.label);
      if (!b.carReady) failures.push('รถไม่พร้อมใช้งาน');
      ready = failures.length === 0;
      answers = { tasks, supervisor: { name: supervisor.fullName, position: supervisor.position, department: supervisor.department }, male: b.male, female: b.female, absent: b.absent, total: b.male + b.female, people, tools, toolAction: clean(b.toolAction), carReady: b.carReady, carReason, carAction, vehicleChecks: jobVehicleChecks.map((label, i) => ({ label, checked: b.vehicleChecks[i] })) };
    }
    const record: InspectionDetail = {
      id, kind, date, vehicleId: vehicle.vehicleId, plate: vehicle.plateNumber, category, createdAt: new Date().toISOString(),
      inspector: { id: inspector.employeeId, name: inspector.fullName, position: inspector.position, department: inspector.department },
      ready, failures, answers, note, approval: kind === 'pre-job' ? 'pending' : null,
    };
    const saved = await googleCall<{ id: string; ready: boolean; approval: InspectionRow['approval'] }>('inspection-save', { record, photo });
    return response(saved, 201);
  } catch (e) { return failed(e); }
}
