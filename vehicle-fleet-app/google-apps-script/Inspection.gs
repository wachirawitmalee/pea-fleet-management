/** Independent append-only inspection log; excluded from fleet snapshot rewrites. */
function inspection_(input, properties) {
  const action = input.action;
  const book = SpreadsheetApp.openById(properties.getProperty('SPREADSHEET_ID'));
  const name = 'InspectionRecords';
  const folderId = '1E1YWUx5ar1ynnww-V83SyfN-RuU3Ltwr';
  const result = (data) => output_({ ok: true, data });
  const conflict = () => output_({ ok: false, code: 'CONFLICT', error: 'Inspection state changed' });
  const lock = LockService.getScriptLock();
  const write = action === 'inspection-save' || action === 'inspection-decide';
  if (write && !lock.tryLock(20000)) return output_({ ok: false, code: 'BUSY', error: 'Storage busy' });
  try {
    let sheet = book.getSheetByName(name);
    const rows = sheet && sheet.getLastRow() > 1
      ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues() : [];
    if (action === 'inspection-summary') {
      return result(rows.filter(row => String(row[1]).startsWith(input.period)).map(row => {
        const x = JSON.parse(row[2]);
        return { id: x.id, kind: x.kind, date: x.date, vehicleId: x.vehicleId, plate: x.plate, category: x.category,
          createdAt: x.createdAt, ready: x.ready, failures: x.failures, approval: x.approval };
      }));
    }
    const id = input.id || (input.record && input.record.id);
    const idx = rows.findIndex(row => row[0] === id);
    const existing = idx < 0 ? null : JSON.parse(rows[idx][2]);
    if (action === 'inspection-detail') return result(existing);
    if (action === 'inspection-photo') {
      if (!existing || !existing.photoId) return output_({ ok: false, code: 'NOT_FOUND', error: 'Photo missing' });
      const file = DriveApp.getFileById(existing.photoId), parents = file.getParents();
      let belongs = false;
      while (parents.hasNext()) if (parents.next().getId() === folderId) belongs = true;
      if (!belongs || file.isTrashed() || file.getSize() > 3000000) throw new Error('Invalid inspection photo');
      const blob = file.getBlob();
      return result({ mime: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()) });
    }
    if (action === 'inspection-decide') {
      if (!existing || existing.kind !== 'pre-job' || existing.approval !== 'pending' ||
          existing.inspector.id === input.by || (input.decision === 'approved' && !existing.ready) || !['approved','rejected'].includes(input.decision)) return conflict();
      existing.approval = input.decision;
      existing.decision = { by: input.by, at: new Date().toISOString(), note: input.note };
      sheet.getRange(idx + 2, 3).setValue(JSON.stringify(existing));
      SpreadsheetApp.flush();
      return result({ ok: true });
    }
    if (action !== 'inspection-save') throw new Error('Unsupported inspection action');
    const x = input.record;
    if (!x || !/^[0-9a-f-]{36}$/.test(x.id) || !/^\d{4}-\d{2}-\d{2}$/.test(x.date)) throw new Error('Invalid record');
    const ack = (v) => ({ id: v.id, ready: v.ready, approval: v.approval });
    if (existing) return result(ack(existing));
    if (!sheet) {
      sheet = book.insertSheet(name);
      sheet.getRange(1, 1, 1, 3).setValues([['ID','Date','Record JSON']]);
      sheet.setFrozenRows(1);
      sheet.getRange('A:C').setNumberFormat('@');
    }
    if (input.photo) {
      const match = /^data:(image\/(jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(input.photo);
      if (!match || input.photo.length > 3000000) throw new Error('Invalid photo');
      const folder = DriveApp.getFolderById(folderId);
      const name = x.id + '.' + match[2];
      const files = folder.getFilesByName(name);
      const file = files.hasNext() ? files.next() : folder.createFile(Utilities.newBlob(Utilities.base64Decode(match[3]), match[1], name));
      x.photoId = file.getId();
    }
    sheet.appendRow([x.id, x.date, JSON.stringify(x)]);
    SpreadsheetApp.flush();
    return result(ack(x));
  } finally { if (write) lock.releaseLock(); }
}
