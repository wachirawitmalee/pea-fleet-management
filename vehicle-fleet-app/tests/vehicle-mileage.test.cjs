const {test}=require('node:test');const assert=require('node:assert/strict');const path=require('node:path');const Module=require('node:module');
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'node'}});
const originalResolve=Module._resolveFilename;
Module._resolveFilename=function(id,...args){return originalResolve.call(this,id.startsWith('@/')?path.join(__dirname,'..',id.slice(2)):id,...args)};
const {reconcileMileage,parseMileage}=require('../lib/vehicle-mileage.ts');
const {vehicleAlerts}=require('../lib/vehicle-alerts.ts');
test('odometer reconciles all three sources, ignores cancelled repairs and never regresses',()=>{
 const v=[{vehicleId:'v',currentMileage:100}];
 assert.equal(reconcileMileage(v,[{vehicleId:'v',mileageOut:120,mileageIn:150}],[{vehicleId:'v',mileage:200,status:'รอตรวจสอบ'}])[0].currentMileage,200);
 assert.equal(reconcileMileage(v,[],[{vehicleId:'v',mileage:90,status:'ปิดใบซ่อม'},{vehicleId:'v',mileage:900,status:'ยกเลิกการซ่อม'}])[0].currentMileage,100);
 for(const x of ['',null,false,-1,'3.5','12x',2147483648]) assert.equal(parseMileage(x),null);
 assert.equal(parseMileage('0'),0);
});
test('tax uses Bangkok calendar date and service checks both distance and date independently',()=>{
 const v={plateNumber:'TEST',currentMileage:10000,nextCheckMileage:10000,taxExpireDate:'2026-10-05',nextCheckDate:'2026-10-20'};
 const a=vehicleAlerts([v],new Date('2026-10-04T17:01:00Z'));
 assert.equal(a.length,3);assert.ok(a.some(x=>x.message.includes('ต่อภาษีวันนี้')));assert.ok(a.some(x=>x.message.includes('15 วัน')));assert.ok(a.some(x=>x.message.includes('ตามเลขไมล์แล้ว')));
 assert.equal(vehicleAlerts([{...v,currentMileage:8999,taxExpireDate:null,nextCheckDate:null}]).length,0);
});
test('real handlers persist repairs, check-in/out and admin odometers; admin corrections persist despite larger history, while employee checks remain',async()=>{
 process.env.DATA_BACKEND='google-sheets';process.env.GOOGLE_STORAGE_SECRET='test-secret-'.repeat(4);process.env.GOOGLE_APPS_SCRIPT_URL='https://script.google.com/macros/s/test/exec';
 const {emptyTables,operate}=require('../lib/storage/records.ts');let stored=emptyTables(),version=1;
 operate(stored,'employee','create',{data:{employeeId:'001',fullName:'Test',position:'Driver',department:'Fleet',workPlace:'Office'}});
 operate(stored,'vehicle','create',{data:{vehicleId:'v',plateNumber:'TEST',brand:'Test',qrCodeData:'v',currentMileage:100}});
 const originalFetch=global.fetch;global.fetch=async(_,opts)=>{const p=JSON.parse(opts.body);if(p.action==='read')return Response.json({ok:true,data:{version:String(version),tables:stored}});assert.equal(p.version,String(version));stored={...stored,...p.tables};version++;return Response.json({ok:true,data:{}})};
 const repairs=require('../app/api/maintenance/route.ts'),vehicles=require('../app/api/vehicles/route.ts'),trips=require('../app/api/check-in-out/route.ts');
 const req=(body)=>new Request('http://localhost',{method:'POST',body:JSON.stringify(body)});
 try{
  let r=await repairs.POST(req({vehicleId:'v',employeeId:'001',issueDesc:'Test',mileage:200}));assert.equal(r.status,201);const ticket=(await r.json()).data;assert.equal(stored.vehicle[0].currentMileage,200);
  r=await repairs.PUT(req({ticketId:ticket.ticketId,status:'เบิกจ่าย',vehicleId:'wrong',mileage:250}));assert.equal(r.status,200);assert.equal(stored.vehicle[0].currentMileage,250);assert.equal(stored.vehicle[0].vehicleStatus,'AVAILABLE');
  r=await trips.POST(req({type:'IN',vehicleId:'v',employeeId:'001',mileage:260}));assert.equal(r.status,200);assert.equal(stored.vehicle[0].currentMileage,260);
  r=await repairs.PUT(req({ticketId:ticket.ticketId,status:'เบิกจ่าย'}));assert.equal(r.status,200);assert.equal(stored.vehicle[0].vehicleStatus,'IN_USE');
  r=await trips.POST(req({type:'OUT',vehicleId:'v',mileage:300}));assert.equal(r.status,200);assert.equal(stored.vehicle[0].currentMileage,300);
  r=await vehicles.PUT(req({...stored.vehicle[0],currentMileage:400}));assert.equal(r.status,200);assert.equal(stored.vehicle[0].currentMileage,400);
  r=await vehicles.PUT(req({...stored.vehicle[0],currentMileage:180}));assert.equal(r.status,200);assert.equal(stored.vehicle[0].currentMileage,180);
  assert.equal((await (await vehicles.GET()).json())[0].currentMileage,180);
  r=await repairs.PUT(req({ticketId:ticket.ticketId,status:'ปิดใบซ่อม',mileage:250}));assert.equal(r.status,200);assert.equal(stored.vehicle[0].currentMileage,180);
  r=await trips.POST(req({type:'IN',vehicleId:'v',employeeId:'001',mileage:170}));assert.equal(r.status,400);
  r=await trips.POST(req({type:'IN',vehicleId:'v',employeeId:'001',mileage:190}));assert.equal(r.status,200);
  r=await trips.POST(req({type:'OUT',vehicleId:'v',mileage:195}));assert.equal(r.status,200);assert.equal(stored.vehicle[0].currentMileage,195);
  r=await vehicles.PUT(req({...stored.vehicle[0],currentMileage:-1}));assert.equal(r.status,400);assert.equal(stored.vehicle[0].currentMileage,195);
  r=await repairs.POST(req({vehicleId:'v',employeeId:'001',issueDesc:'old report',mileage:150}));assert.equal(r.status,201);assert.equal(stored.vehicle[0].currentMileage,195);
  r=await repairs.PUT(req({ticketId:ticket.ticketId,status:'เบิกจ่าย'}));assert.equal(r.status,200);assert.equal(stored.vehicle[0].vehicleStatus,'MAINTENANCE');
  const count=stored.maintenanceTicket.length;r=await repairs.POST(req({vehicleId:'v',employeeId:'001',issueDesc:'invalid',mileage:'2.5'}));assert.equal(r.status,400);assert.equal(stored.maintenanceTicket.length,count);
 }finally{global.fetch=originalFetch}
});
