// Deploy with the Advanced Google Sheets service enabled. See docs/GOOGLE-STORAGE.md.
// Schema.gs is generated from storage-schema.json by npm run google:bundle.
function doPost(e) {
  try {
    const input = JSON.parse(e.postData.contents);
    const properties = PropertiesService.getScriptProperties();
    const secret = properties.getProperty('STORAGE_SECRET');
    if (!secret || secret.length < 32 || input.secret !== secret) return output_({ ok: false, code: 'AUTH', error: 'Unauthorized' });
    if (input.action === 'upload') return output_({ ok: true, data: upload_(input, properties) });
    if (input.action === 'photo') return output_({ ok: true, data: photo_(input, properties) });
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) return output_({ ok: false, code: 'BUSY', error: 'Storage busy' });
    try {
      const id = properties.getProperty('SPREADSHEET_ID');
      const snapshot = read_(id);
      if (input.action === 'read') return output_({ ok: true, data: snapshot });
      if (input.action !== 'commit') throw new Error('Unsupported action');
      if (input.version !== snapshot.version) return output_({ ok: false, code: 'CONFLICT', error: 'Snapshot changed' });
      const sheetInfo = Sheets.Spreadsheets.get(id, { fields: 'sheets.properties' }).sheets;
      const requests = [];
      Object.keys(input.tables).forEach(key => {
        const model = FLEET_SCHEMA.find(m => key_(m.name) === key);
        if (!model || !Array.isArray(input.tables[key])) throw new Error('Invalid table');
        const fields = model.fields.filter(f => f.kind !== 'object');
        const sheet = sheetInfo.find(s => s.properties.title === model.name).properties;
        const rows = input.tables[key];
        if (rows.length + 1 > sheet.gridProperties.rowCount) requests.push({ appendDimension: { sheetId: sheet.sheetId, dimension: 'ROWS', length: rows.length + 1 - sheet.gridProperties.rowCount } });
        const values = [fields.map(f => f.name)].concat(rows.map(row => fields.map(f => row[f.name] == null ? '' : row[f.name])));
        requests.push({ updateCells: {
          range: { sheetId: sheet.sheetId, startRowIndex: 0, endRowIndex: Math.max(rows.length, snapshot.tables[key].length) + 1, startColumnIndex: 0, endColumnIndex: fields.length },
          rows: values.map(row => ({ values: row.map(value => ({ userEnteredValue: typeof value === 'number' ? { numberValue: value } : typeof value === 'boolean' ? { boolValue: value } : { stringValue: String(value) } })) })),
          fields: 'userEnteredValue'
        } });
      });
      // One atomic Sheets API request: all affected tables succeed or none do.
      if (requests.length) Sheets.Spreadsheets.batchUpdate({ requests }, id);
      return output_({ ok: true, data: { committed: true } });
    } finally { lock.releaseLock(); }
  } catch (error) {
    console.error(error.message);
    return output_({ ok: false, code: 'STORAGE', error: 'Google storage operation failed' });
  }
}

function output_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
function key_(name) { return name.charAt(0).toLowerCase() + name.slice(1); }
function hash_(text) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text).map(b => (b & 255).toString(16).padStart(2, '0')).join(''); }

function read_(id) {
  const result = Sheets.Spreadsheets.Values.batchGet(id, { ranges: FLEET_SCHEMA.map(m => "'" + m.name + "'"), valueRenderOption: 'UNFORMATTED_VALUE' });
  const tables = {};
  FLEET_SCHEMA.forEach((model, index) => {
    const values = result.valueRanges[index].values || [];
    const fields = model.fields.filter(f => f.kind !== 'object');
    if (JSON.stringify(values[0]) !== JSON.stringify(fields.map(f => f.name))) throw new Error('Invalid headers: ' + model.name);
    tables[key_(model.name)] = values.slice(1).filter(row => row.some(v => v !== '')).map(row => {
      const record = {};
      fields.forEach((field, col) => {
        const value = row[col];
        record[field.name] = value === undefined || value === '' ? (field.isRequired && field.type === 'String' ? '' : null) : value;
      });
      return record;
    });
  });
  return { version: hash_(JSON.stringify(tables)), tables };
}

// Run once in the Apps Script editor after setting SPREADSHEET_ID.
// Existing tabs are never cleared or overwritten.
function setupSheets() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const book = SpreadsheetApp.openById(id);
  FLEET_SCHEMA.forEach(model => {
    if (book.getSheetByName(model.name)) return;
    const fields = model.fields.filter(f => f.kind !== 'object');
    const sheet = book.insertSheet(model.name);
    if (sheet.getMaxColumns() < fields.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), fields.length - sheet.getMaxColumns());
    sheet.getRange(1, 1, 1, fields.length).setValues([fields.map(f => f.name)]).setBackground('#4f46e5').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, fields.length, 160);
    // IDs and ISO dates are text to preserve leading zeros and exact timezones.
    fields.forEach((f, i) => { if (['String', 'DateTime'].includes(f.type)) sheet.getRange(2, i + 1, sheet.getMaxRows() - 1, 1).setNumberFormat('@'); });
  });
}

function upload_(input, properties) {
  if (typeof input.data !== 'string' || input.data.length > 7000000) throw new Error('Invalid image size');
  const match = input.data.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error('Invalid image');
  const bytes = Utilities.base64Decode(match[2]);
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new Error('Invalid image size');
  const folder = DriveApp.getFolderById(properties.getProperty('IMAGE_FOLDER_ID'));
  const name = hash_(input.data) + '.' + match[1].split('/')[1];
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const files = folder.getFilesByName(name);
    const file = files.hasNext() ? files.next() : folder.createFile(Utilities.newBlob(bytes, match[1], name));
    // Keep original Drive permissions. Never enable public link sharing.
    return { id: file.getId() };
  } finally { lock.releaseLock(); }
}

function photo_(input, properties) {
  if (!/^[\w-]+$/.test(input.id || '')) throw new Error('Invalid image ID');
  const file = DriveApp.getFileById(input.id);
  const parents = file.getParents();
  let allowed = false;
  while (parents.hasNext()) if (parents.next().getId() === properties.getProperty('IMAGE_FOLDER_ID')) allowed = true;
  if (!allowed || file.isTrashed() || file.getSize() > 5 * 1024 * 1024) throw new Error('Image not found');
  const blob = file.getBlob();
  if (!/^image\/(jpeg|png|webp)$/.test(blob.getContentType())) throw new Error('Unsupported image');
  return { mimeType: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()) };
}
