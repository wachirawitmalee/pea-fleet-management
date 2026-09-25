const { test } = require('node:test');
const assert = require('node:assert/strict');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { emptyTables, operate, hydrate, validateTables } = require('../lib/storage/records.ts');
const { fleetAnalytics } = require('../lib/analytics.ts');
const { bookingTime, bangkokMonth } = require('../lib/fleet-time.ts');

function fixture() {
  const db = emptyTables();
  operate(db, 'employee', 'create', { data: { employeeId: '001', fullName: 'Test', position: 'Driver', department: 'Fleet', workPlace: 'Office' } });
  operate(db, 'vehicle', 'create', { data: { vehicleId: 'v1', plateNumber: 'TEST-1', brand: 'Test', qrCodeData: 'v1' } });
  return db;
}

test('storage preserves IDs, defaults, dates and relations through JSON', () => {
  const db = fixture();
  operate(db, 'reservation', 'create', { data: { reservationId: 'r1', employeeId: '001', vehicleId: 'v1', startDate: new Date('2026-09-01'), endDate: new Date('2026-09-01'), startTime: '08:00', endTime: '09:00', destination: 'Site', purpose: 'Work' } });
  const roundtrip = hydrate(JSON.parse(JSON.stringify(db)));
  validateTables(roundtrip);
  const row = operate(roundtrip, 'reservation', 'findUnique', { where: { reservationId: 'r1' }, include: { employee: true, vehicle: true, logs: true } });
  assert.equal(row.employee.employeeId, '001');
  assert.equal(row.employee.status, 'ACTIVE');
  assert.equal(row.vehicle.currentMileage, 0);
  assert.equal(row.logs, null);
  assert.equal(row.startDate.toISOString(), '2026-09-01T00:00:00.000Z');
  const selected = operate(roundtrip, 'reservation', 'findUnique', { where: { reservationId: 'r1' }, select: { reservationId: true, employee: { select: { fullName: true } } } });
  assert.deepEqual(selected, { reservationId: 'r1', employee: { fullName: 'Test' } });
});

test('uniqueness, foreign keys and invalid numbers reject a transaction', () => {
  const db = fixture();
  operate(db, 'vehicle', 'create', { data: { plateNumber: 'TEST-1', brand: 'Other', qrCodeData: 'v2' } });
  assert.throws(() => validateTables(db), /Duplicate/);
  const missing = fixture();
  operate(missing, 'checkInOutLog', 'create', { data: { vehicleId: 'v1', employeeId: 'missing', mileageOut: 1 } });
  assert.throws(() => validateTables(missing), /Missing reference/);
  const invalid = fixture();
  operate(invalid, 'vehicle', 'update', { where: { vehicleId: 'v1' }, data: { currentMileage: NaN } });
  assert.throws(() => validateTables(invalid), /Invalid number/);
});

test('filter, sort, projection and upsert used by existing endpoints work', () => {
  const db = fixture();
  for (const [id, date] of [['f1', '2026-08-10'], ['f2', '2026-09-10'], ['f3', '2026-09-11']]) operate(db, 'fuelRecord', 'create', { data: { id, vehicleId: 'v1', date: new Date(date), mileage: 10, fuelType: 'Diesel', quantity: 10, pricePerLiter: 30, totalAmount: 300, netAmount: 280.37, vatAmount: 19.63 } });
  const result = operate(db, 'fuelRecord', 'findMany', { where: { date: { gte: new Date('2026-09-01'), lte: new Date('2026-09-30') } }, orderBy: { date: 'desc' }, select: { id: true } });
  assert.deepEqual(result, [{ id: 'f3' }, { id: 'f2' }]);
  operate(db, 'employee', 'upsert', { where: { employeeId: '001' }, update: { fullName: 'Updated' }, create: {} });
  assert.equal(db.employee.length, 1);
  assert.equal(db.employee[0].fullName, 'Updated');
  validateTables(db);
  operate(db, 'vehicle', 'delete', { where: { vehicleId: 'v1' } });
  assert.equal(db.fuelRecord.length, 0);
  validateTables(db);
});

test('Thai month boundary, weighted fuel price, cancelled repair, invalid mileage and zero baseline', () => {
  assert.equal(bookingTime('2026-09-01', '08:30').toISOString(), '2026-09-01T01:30:00.000Z');
  assert.equal(bangkokMonth('2026-08-31T17:00:00Z'), '2026-09');
  const result = fleetAnalytics([{ vehicleId: 'v1', plateNumber: 'TEST-1' }], [
    { date: '2026-08-31T17:00:00Z', vehicleId: 'v1', quantity: 10, totalAmount: 300 },
    { date: '2026-09-02', vehicleId: 'v1', quantity: 30, totalAmount: 1200 },
  ], [
    { vehicleId: 'v1', checkOutTime: '2026-09-02', mileageOut: 100, mileageIn: 300 },
    { vehicleId: 'v1', checkOutTime: '2026-09-02', mileageOut: 500, mileageIn: 400 },
    { vehicleId: 'v1', checkOutTime: null, mileageOut: 300, mileageIn: null },
  ], [
    { vehicleId: 'v1', requestDate: '2026-09-05', cost: 500, status: 'ปิดใบซ่อม' },
    { vehicleId: 'v1', requestDate: '2026-09-05', cost: 999, status: 'ยกเลิกการซ่อม' },
  ], '2026-09');
  assert.equal(result.fuelCost, 1500);
  assert.equal(result.averagePrice, 37.5);
  assert.equal(result.distance, 200);
  assert.equal(result.invalidTrips, 1);
  assert.equal(result.maintenanceCost, 500);
  assert.equal(result.fuelCostChange, null);
  assert.equal(result.vehicles[0].fuelCostPerKm, 7.5);
  assert.equal(fleetAnalytics([], [], [], [], '2026-01').months[0].month, '2025-08');
});

test('Sheets wrapper commits atomically, retries conflicts with fresh state and rolls back failed handlers', async () => {
  process.env.DATA_BACKEND = 'google-sheets';
  process.env.GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/test/exec';
  process.env.GOOGLE_STORAGE_SECRET = 'test-secret-'.repeat(4);
  const { withStorage, sheetsClient } = require('../lib/storage/sheets.ts');
  let stored = fixture(), version = 1, commits = 0, conflict = false;
  const originalFetch = global.fetch;
  global.fetch = async (_url, options) => {
    const input = JSON.parse(options.body);
    if (input.action === 'read') return Response.json({ ok: true, data: { version: String(version), tables: stored } });
    commits++;
    if (conflict) { conflict = false; version++; return Response.json({ ok: false, code: 'CONFLICT' }); }
    assert.equal(input.version, String(version));
    stored = { ...stored, ...input.tables }; version++;
    return Response.json({ ok: true, data: {} });
  };
  try {
    const failed = withStorage(async () => { await sheetsClient.vehicle.update({ where: { vehicleId: 'v1' }, data: { currentMileage: 99 } }); return Response.json({}, { status: 400 }); });
    assert.equal((await failed()).status, 400);
    assert.equal(stored.vehicle[0].currentMileage, 0);
    assert.equal(commits, 0);
    conflict = true;
    let runs = 0;
    const success = withStorage(async request => {
      runs++;
      const data = await request.json();
      await sheetsClient.vehicle.update({ where: { vehicleId: 'v1' }, data: { currentMileage: data.mileage } });
      return Response.json({ ok: true });
    });
    assert.equal((await success(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ mileage: 100 }) }))).status, 200);
    assert.equal(runs, 2);
    assert.equal(stored.vehicle[0].currentMileage, 100);
    assert.equal(commits, 2);
    // A transport failure has an ambiguous outcome, so must never be retried.
    global.fetch = async (_url, options) => {
      if (JSON.parse(options.body).action === 'read') return Response.json({ ok: true, data: { version: String(version), tables: stored } });
      commits++; throw new Error('Network timeout');
    };
    const response = await success(new Request('http://localhost', { method: 'POST', body: '{"mileage":101}' }));
    assert.equal(response.status, 503);
    assert.equal(commits, 3);
  } finally { global.fetch = originalFetch; delete process.env.DATA_BACKEND; }
});
