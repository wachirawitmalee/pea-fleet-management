const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
test('Inspection starts empty, preserves evidence and accepts only a separate approver once', () => {
  let rows = [], sheetExists = false, createdFiles = 0;
  const sheet = {
    getLastRow: () => rows.length,
    getRange: (row, col, n) => typeof row === 'string' ? { setNumberFormat() {} } : ({
      getValues: () => rows.slice(row-1, row-1+n),
      setValues: value => { rows = value; },
      setValue: value => { rows[row-1][col-1] = value; },
    }),
    setFrozenRows() {}, appendRow: row => rows.push(row),
  };
  const ctx = {
    output_: x => x,
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheetExists ? sheet : null, insertSheet: () => { sheetExists = true; return sheet; } }), flush() {} },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    DriveApp: { getFolderById: () => ({ getFilesByName: () => ({hasNext:()=>false}),createFile: () => {createdFiles++;return {getId:()=> 'photo-id'};} }) },
    Utilities: { newBlob: () => ({}),base64Decode: () => [1] },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('google-apps-script/Inspection.gs','utf8'),ctx);
  const run = (action, rest) => ctx.inspection_({action:'inspection-'+action,...rest},{getProperty:()=> 'sheet'});
  const record = {id:'12345678-1111-1111-1111-123456789abc',kind:'pre-job',date:'2026-11-11',vehicleId:'vehicle',plate:'TEST',category:'รถยนต์',createdAt:'2026-11-11T07:00:00Z',ready:true,failures:[],approval:'pending',inspector:{id:'A',name:'Private Name'},answers:{private:'secret'}};
  assert.equal(run('summary',{period:'2026-11'}).data.length,0);
  assert.equal(run('save',{record,photo:'data:image/jpeg;base64,AA=='}).data.approval,'pending');
  run('save',{record,photo:'data:image/jpeg;base64,AA=='});
  assert.equal(createdFiles,1);assert.equal(rows.length,2);
  assert.equal(run('summary',{period:'2026-10'}).data.length,0);
  const summary=run('summary',{period:'2026-11-11'}).data[0];
  assert.equal(summary.plate,'TEST');assert.equal(summary.photoId,undefined);assert.equal(summary.inspector,undefined);assert.equal(summary.answers,undefined);
  assert.equal(run('decide',{id:record.id,decision:'approved',by:'A'}).code,'CONFLICT');
  assert.equal(run('decide',{id:record.id,decision:'approved',by:'B'}).ok,true);
  assert.equal(run('decide',{id:record.id,decision:'rejected',by:'B'}).code,'CONFLICT');
  assert.equal(run('detail',{id:record.id}).data.decision.by,'B');
  const rank=run('ranking',{period:'2026-11',kind:'pre-job',vehicleIds:['vehicle']}).data;
  assert.equal(rank.length,1);assert.equal(rank[0].name,'Private Name');assert.equal(rank[0].count,1);
  assert.equal(run('ranking',{period:'2026-11',kind:'vehicle',vehicleIds:['vehicle']}).data.length,0);
  assert.equal(run('ranking',{period:'2026-11',kind:'pre-job',vehicleIds:[]}).data.length,0);

});

test('Teams daily card counts each enrolled vehicle once and separates missing plates by branch',()=>{
  const ctx={};vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('google-apps-script/InspectionTeams.gs','utf8'),ctx);
  const fleet=ctx.inspectionTeamsFleet_({
    vehicle:[{vehicleId:'a',plateNumber:'A-111'},{vehicleId:'b',plateNumber:'B-222'},{vehicleId:'c',plateNumber:'C-333'}],
    systemSetting:[{id:'inspection-vehicle:a'},{id:'inspection-vehicle:b'},{id:'vehicle-branch:b',alertEmail:'กฟส.สทิงพระ'}]
  });
  const day='2026-11-11';
  const r=ctx.inspectionTeamsDailyCard_(day,fleet,[
    {kind:'vehicle',date:day,vehicleId:'a'},{kind:'vehicle',date:day,vehicleId:'a'},{kind:'pre-job',date:day,vehicleId:'b'}
  ]);
  const body=r.attachments[0].content.body;
  assert.equal(body[2].facts[0].value,'1 คัน');
  assert.equal(body[2].facts[1].value,'1 คัน');
  const encoded=JSON.stringify(r);
  assert.ok(encoded.includes('กฟส.สทิงพระ'));assert.ok(encoded.includes('B-222'));assert.ok(!encoded.includes('C-333'));
});
