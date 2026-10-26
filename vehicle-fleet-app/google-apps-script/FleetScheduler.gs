// Runs on the owner account. Requires TEAMS_WORKFLOW_URL in Script Properties.
function fleetBookingTime_(date, time) {
  return new Date(String(date).slice(0, 10) + 'T' + time + ':00+07:00').getTime();
}
function fleetDay_(now) { return Utilities.formatDate(now, 'Asia/Bangkok', 'yyyy-MM-dd'); }
function fleetExpired_(bookings, logs, now) {
  const received = new Set(logs.map(l => l.reservationId));
  return bookings.filter(b => b.reservationStatus === 'BOOKED' && !received.has(b.reservationId)
    && now.getTime() >= fleetBookingTime_(b.startDate, b.startTime) + 30 * 60000);
}
function fleetEventKey_(id) { return 'FLEET_EVENT_' + hash_(id); }
function fleetQueue_(properties, id, title, lines, link) {
  const key = fleetEventKey_(id);
  if (properties.getProperty(key)) return;
  properties.setProperty(key, JSON.stringify({ state: 'pending', title: title, lines: lines, link: link }));
}
function fleetCard_(title, lines, link) {
  return { type: 'message', attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', contentUrl: null,
    content: { $schema: 'http://adaptivecards.io/schemas/adaptive-card.json', type: 'AdaptiveCard', version: '1.2',
      body: [{ type: 'TextBlock', text: title, weight: 'Bolder', size: 'Medium', wrap: true }].concat(lines.map(text => ({ type: 'TextBlock', text: String(text), wrap: true }))),
      actions: [{ type: 'Action.OpenUrl', title: 'เปิดระบบรถยนต์', url: link || 'https://pea-fleet-management.vercel.app/schedule' }] } }] };
}
function fleetFlush_(properties) {
  const url = properties.getProperty('TEAMS_WORKFLOW_URL');
  if (!url || !/^https:\/\/[a-z0-9.-]+\.api\.powerplatform\.com(?::443)?\/powerautomate\//.test(url)) throw new Error('Missing or invalid Teams workflow URL');
  const all = properties.getProperties();
  let sent = 0;
  for (const key of Object.keys(all).filter(k => k.startsWith('FLEET_EVENT_'))) {
    const entry = JSON.parse(all[key]);
    if (entry.state !== 'pending' || sent >= 10) continue;
    // A timeout is ambiguous: preserve "sending" for review rather than resend
    // a message which the Workflow may already have delivered.
    properties.setProperty(key, JSON.stringify({ state: 'sending', attemptedAt: new Date().toISOString(), title: entry.title }));
    let response;
    try {
      response = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(fleetCard_(entry.title, entry.lines, entry.link)), muteHttpExceptions: true, followRedirects: false });
    } catch (e) { console.error('Teams transport outcome unknown; review event ' + key); continue; }
    const code = response.getResponseCode();
    if (code >= 200 && code < 300) {
      properties.setProperty(key, JSON.stringify({ state: 'sent', sentAt: new Date().toISOString() })); sent++;
    } else {
      properties.setProperty(key, JSON.stringify(Object.assign(entry, { lastStatus: code })));
      console.error('Teams delivery rejected with HTTP ' + code);
      break;
    }
  }
  return sent;
}
function fleetWriteReservations_(id, rows) {
  const model = FLEET_SCHEMA.find(m => m.name === 'Reservation');
  const fields = model.fields.filter(f => f.kind !== 'object');
  const sheet = Sheets.Spreadsheets.get(id, { fields: 'sheets.properties' }).sheets.find(s => s.properties.title === 'Reservation').properties;
  const values = [fields.map(f => f.name)].concat(rows.map(r => fields.map(f => r[f.name] == null ? '' : r[f.name])));
  Sheets.Spreadsheets.batchUpdate({ requests: [{ updateCells: { range: { sheetId: sheet.sheetId, startRowIndex: 0, endRowIndex: rows.length + 1, startColumnIndex: 0, endColumnIndex: fields.length },
    rows: values.map(row => ({ values: row.map(value => ({ userEnteredValue: { stringValue: String(value) } })) })), fields: 'userEnteredValue' } }] }, id);
}
function fleetBookingDetails_(b, tables) {
  const car = tables.vehicle.find(v => v.vehicleId === b.vehicleId);
  const employee = tables.employee.find(e => String(e.employeeId) === String(b.employeeId));
  return [ 'รถ: ' + (car ? car.plateNumber : b.vehicleId), 'ผู้จอง: ' + (employee ? employee.fullName : b.employeeId),
    'รับรถ: ' + String(b.startDate).slice(0, 10) + ' ' + b.startTime + ' น.',
    'คืนรถ: ' + String(b.endDate).slice(0, 10) + ' ' + b.endTime + ' น.',
    'ภารกิจ: ' + String(b.purpose || '').slice(0, 250), 'ปลายทาง: ' + String(b.destination || '').slice(0, 150) ];
}
function fleetTick() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  try {
    const properties = PropertiesService.getScriptProperties();
    if (properties.getProperty('FLEET_ENABLED') !== 'true') return;
    const now = new Date(), id = properties.getProperty('SPREADSHEET_ID');
    const tables = read_(id).tables, bookings = tables.reservation;
    // Baseline existing cancellations once, then queue only newly cancelled bookings.
    // Queue persistence happens before updating the registry so rejected deliveries remain retryable.
    const cancelledIds = bookings.filter(b => b.reservationStatus === 'CANCELLED').map(b => b.reservationId);
    const previousCancelled = properties.getProperty('FLEET_SEEN_CANCELLATIONS');
    const seenCancelled = new Set(JSON.parse(previousCancelled || '[]'));
    if (previousCancelled !== null && previousCancelled !== undefined) {
      bookings.filter(b => b.reservationStatus === 'CANCELLED' && !seenCancelled.has(b.reservationId)).forEach(b =>
        fleetQueue_(properties, 'manual-cancel:' + b.reservationId, 'ยกเลิกการจองรถ', fleetBookingDetails_(b, tables), 'https://pea-fleet-management.vercel.app/schedule'));
    }
    if (JSON.stringify(cancelledIds).length > 8500) throw new Error('Cancellation registry is full; archive old reservations');
    properties.setProperty('FLEET_SEEN_CANCELLATIONS', JSON.stringify(cancelledIds));
    const expired = fleetExpired_(bookings, tables.checkInOutLog, now);
    if (expired.length) {
      const ids = new Set(expired.map(b => b.reservationId));
      bookings.forEach(b => { if (ids.has(b.reservationId)) b.reservationStatus = 'EXPIRED'; });
      // Uses the same lock as the web app; its CAS version rejects stale writes.
      fleetWriteReservations_(id, bookings);
      expired.forEach(b => fleetQueue_(properties, 'cancel:' + b.reservationId, 'ยกเลิกคิวอัตโนมัติ: ไม่รับรถภายใน 30 นาที', fleetBookingDetails_(b, tables)));
    }
    const seen = new Set(JSON.parse(properties.getProperty('FLEET_SEEN_BOOKINGS') || '[]'));
    const day = fleetDay_(now);
    for (const b of bookings) {
      const details = fleetBookingDetails_(b, tables), link = 'https://pea-fleet-management.vercel.app/vehicle/' + encodeURIComponent(b.vehicleId);
      if (!seen.has(b.reservationId)) {
        if (b.reservationStatus === 'BOOKED') fleetQueue_(properties, 'new:' + b.reservationId, 'มีรายการจองรถใหม่', details, link);
        seen.add(b.reservationId);
      }
      const start = fleetBookingTime_(b.startDate, b.startTime), end = fleetBookingTime_(b.endDate, b.endTime);
      if (b.reservationStatus === 'BOOKED' && now.getTime() >= start && now.getTime() < start + 30 * 60000) fleetQueue_(properties, 'pickup:' + b.reservationId + ':' + start, 'ถึงเวลารับรถแล้ว', details, link);
      const activeLog = tables.checkInOutLog.some(l => l.reservationId === b.reservationId && !l.checkOutTime);
      if (b.reservationStatus === 'CHECKED_IN' && activeLog && now.getTime() >= end) {
        if (now.getTime() < end + 30 * 60000) fleetQueue_(properties, 'return:' + b.reservationId + ':' + end, 'ถึงเวลาคืนรถแล้ว', details, link);
        else fleetQueue_(properties, 'overdue:' + b.reservationId + ':' + day, 'รถยังไม่คืน: เลยกำหนดแล้วอย่างน้อย 30 นาที', details, link);
      }
    }
    // Prune deleted booking IDs; splitting keeps each property below 9 KB.
    const allIds = Array.from(seen).filter(id => bookings.some(b => b.reservationId === id));
    if (JSON.stringify(allIds).length > 8500) throw new Error('Booking registry is full; archive old reservations');
    properties.setProperty('FLEET_SEEN_BOOKINGS', JSON.stringify(allIds));
    const clock = Utilities.formatDate(now, 'Asia/Bangkok', 'HH:mm');
    if (clock >= '08:30' && clock < '09:00') {
      const today = bookings.filter(b => ['BOOKED', 'CHECKED_IN', 'COMPLETED'].includes(b.reservationStatus) && String(b.startDate).slice(0, 10) <= day && String(b.endDate).slice(0, 10) >= day)
        .sort((a, b) => fleetBookingTime_(a.startDate, a.startTime) - fleetBookingTime_(b.startDate, b.startTime));
      const chunks = [];
      for (let i = 0; i < today.length; i += 5) chunks.push(today.slice(i, i + 5));
      if (!chunks.length) chunks.push([]);
      chunks.forEach((rows, i) => fleetQueue_(properties, 'daily:' + day + ':' + i, 'สรุปคิวรถวันนี้ ' + day + ' (' + today.length + ' รายการ)' + (chunks.length > 1 ? ' ส่วน ' + (i + 1) + '/' + chunks.length : ''),
        rows.length ? rows.map(b => fleetBookingDetails_(b, tables).join('\n') + '\nสถานะ: ' + (b.reservationStatus === 'COMPLETED' ? 'คืนรถแล้ว' : b.reservationStatus === 'CHECKED_IN' ? 'รับรถแล้ว' : 'รอรับรถ')) : ['วันนี้ไม่มีคิวจองรถที่ยังใช้งานอยู่']));
    }
    const sent = fleetFlush_(properties);
    properties.setProperty('FLEET_LAST_RUN', JSON.stringify({ at: now.toISOString(), expired: expired.length, sent: sent }));
  } finally { lock.releaseLock(); }
}
function enableFleetScheduler() {
  const properties = PropertiesService.getScriptProperties();
  if (!properties.getProperty('TEAMS_WORKFLOW_URL')) throw new Error('Set TEAMS_WORKFLOW_URL first');
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    if (!properties.getProperty('FLEET_INITIALIZED')) {
      properties.setProperty('FLEET_SEEN_BOOKINGS', JSON.stringify(read_(properties.getProperty('SPREADSHEET_ID')).tables.reservation.map(b => b.reservationId)));
      properties.setProperty('FLEET_INITIALIZED', new Date().toISOString());
    }
    if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'fleetTick')) ScriptApp.newTrigger('fleetTick').timeBased().everyMinutes(5).create();
    properties.setProperty('FLEET_ENABLED', 'true');
  } finally { lock.releaseLock(); }
  console.log('Fleet scheduler enabled: checks every 5 minutes, daily summary at 08:30 Bangkok.');
}
function testTeamsConnection() {
  const properties = PropertiesService.getScriptProperties();
  fleetQueue_(properties, 'connection-test-v1', 'ทดสอบระบบแจ้งเตือน Smart Fleet Care', ['เชื่อมต่อ Teams สำเร็จ — แจ้งจองใหม่ รับ–คืนรถ รถเลยกำหนด และสรุปคิวช่วง 08:30 น.']);
  console.log('Messages accepted by Workflow: ' + fleetFlush_(properties));
}
