const { test } = require('node:test');
const assert = require('node:assert/strict');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { vehicleUrl, vehicleLookup } = require('../lib/vehicle-qr.ts');
test('vehicle QR uses stable deep link, supports legacy code and rejects foreign links', async () => {
  const link = vehicleUrl('https://fleet.example', 'car-123');
  assert.equal(link, 'https://fleet.example/vehicle/car-123');
  assert.deepEqual(vehicleLookup(link, 'https://fleet.example'), { vehicleId: 'car-123' });
  assert.deepEqual(vehicleLookup(' PEA-CAR-123 ', 'https://fleet.example'), { code: 'PEA-CAR-123' });
  assert.throws(() => vehicleLookup('https://evil.example/vehicle/car-123', 'https://fleet.example'));
  assert.throws(() => vehicleLookup('https://fleet.example/admin', 'https://fleet.example'));
  const qr = require('qrcode').create(link, { errorCorrectionLevel: 'Q' });
  assert.ok(qr.modules.size >= 21);
  assert.equal(qr.segments.map(s => Buffer.from(s.data).toString()).join(''), link);
});
