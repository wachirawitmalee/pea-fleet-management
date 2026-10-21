const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),Module=require('node:module');require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'node'}});const origResolve=Module._resolveFilename;Module._resolveFilename=function(id,...args){return origResolve.call(this,id.startsWith('@/')?path.join(__dirname,'..',id.slice(2)):id,...args)};
process.env.DATA_BACKEND='google-sheets';process.env.GOOGLE_STORAGE_SECRET='test-secret-'.repeat(4);process.env.GOOGLE_APPS_SCRIPT_URL='https://script.google.com/macros/s/test/exec';
const {emptyTables,operate}=require('../lib/storage/records.ts'),{canHandover}=require('../lib/vehicle-handover.ts'),{POST}=require('../app/api/check-in-out/route.ts');
function fixture(){const t=emptyTables();operate(t,'employee','create',{data:{employeeId:'001',fullName:'Test',position:'Driver',department:'Fleet',workPlace:'Office'}});operate(t,'vehicle','create',{data:{vehicleId:'v',plateNumber:'TEST',brand:'Test',qrCodeData:'v',currentMileage:150,vehicleStatus:'IN_USE'}});for(const [id,start,end,status] of [['old','08:00','10:00','CHECKED_IN'],['next','12:00','13:00','BOOKED']])operate(t,'reservation','create',{data:{reservationId:id,vehicleId:'v',employeeId:'001',startDate:new Date('2026-10-15'),endDate:new Date('2026-10-15'),startTime:start,endTime:end,destination:'Work',purpose:'Work',reservationStatus:status}});operate(t,'checkInOutLog','create',{data:{logId:'old-log',reservationId:'old',vehicleId:'v',employeeId:'001',checkInTime:new Date('2026-10-15T01:00:00Z'),mileageOut:100}});return t}
test('handover requires all open bookings to be overdue and never treats walk-ins as scheduled overdue trips',()=>{const t=fixture(),at=new Date('2026-10-15T05:00:00Z');assert.ok(canHandover(t.checkInOutLog,t.reservation,at));assert.equal(canHandover(t.checkInOutLog,t.reservation,new Date('2026-10-15T02:00:00Z')),false);assert.equal(canHandover([{...t.checkInOutLog[0],reservationId:null}],t.reservation,at),false)});
test('next booking can receive with explicit confirmation; old return stays open and cannot reset the new trip',async()=>{const RealDate=Date;const fixed=new RealDate('2026-10-15T05:00:00Z').getTime();global.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[fixed]))}static now(){return fixed}};let stored=fixture(),version=1;const originalFetch=global.fetch;global.fetch=async(_,o)=>{const p=JSON.parse(o.body);if(p.action==='read')return Response.json({ok:true,data:{version:String(version),tables:stored}});assert.equal(p.version,String(version));stored={...stored,...p.tables};version++;return Response.json({ok:true,data:{}})};const run=b=>POST(new Request('http://localhost',{method:'POST',body:JSON.stringify(b)}));try{
 let r=await run({reservationId:'next',type:'IN',mileage:150});assert.equal(r.status,409);assert.equal(stored.checkInOutLog.length,1);
 stored.vehicle[0].vehicleStatus='MAINTENANCE';r=await run({reservationId:'next',type:'IN',mileage:150,confirmPreviousReturned:true});assert.equal(r.status,409);stored.vehicle[0].vehicleStatus='IN_USE';
 r=await run({reservationId:'next',type:'IN',mileage:150,confirmPreviousReturned:true});assert.equal(r.status,200);assert.equal(stored.checkInOutLog.length,2);assert.equal(stored.checkInOutLog[0].checkOutTime,null);assert.equal(stored.reservation[0].reservationStatus,'CHECKED_IN');assert.ok(stored.checkInOutLog[0].remark.includes('[HANDOVER]'));
 r=await run({reservationId:'next',type:'IN',mileage:150,confirmPreviousReturned:true});assert.equal(r.status,409);assert.equal(stored.checkInOutLog.length,2);
 r=await run({reservationId:'old',type:'OUT',mileage:140});assert.equal(r.status,400);
 r=await run({reservationId:'old',type:'OUT',mileage:140,actualReturn:'not-a-date'});assert.equal(r.status,400);
 r=await run({reservationId:'old',type:'OUT',mileage:160,actualReturn:'2026-10-15T11:00'});assert.equal(r.status,400);
 r=await run({reservationId:'old',type:'OUT',mileage:140,actualReturn:'2026-10-15T13:00'});assert.equal(r.status,400);
 r=await run({reservationId:'old',type:'OUT',mileage:140,actualReturn:'2026-10-15T11:00'});assert.equal(r.status,200);assert.equal(stored.vehicle[0].vehicleStatus,'IN_USE');assert.equal(stored.vehicle[0].currentMileage,150);
 r=await run({reservationId:'next',type:'OUT',mileage:200});assert.equal(r.status,200);assert.equal(stored.vehicle[0].vehicleStatus,'AVAILABLE');assert.equal(stored.vehicle[0].currentMileage,200);
 stored=fixture();r=await run({reservationId:'next',type:'IN',mileage:150,confirmPreviousReturned:true});assert.equal(r.status,200);r=await run({reservationId:'next',type:'OUT',mileage:200});assert.equal(r.status,200);assert.equal(stored.vehicle[0].vehicleStatus,'AVAILABLE');assert.equal(stored.checkInOutLog[0].checkOutTime,null);
 r=await run({reservationId:'old',type:'OUT',mileage:140,actualReturn:'2026-10-15T11:00'});assert.equal(r.status,200);assert.equal(stored.vehicle[0].currentMileage,200);assert.equal(stored.vehicle[0].vehicleStatus,'AVAILABLE');
 stored=fixture();stored.reservation[1].reservationStatus='EXPIRED';stored.reservation[1].startTime='11:00';r=await run({type:'LATE',reservationId:'next',employeeId:'001',actualStart:'2026-10-15T11:00',mileage:150,returned:false});assert.equal(r.status,409);
 r=await run({type:'LATE',reservationId:'next',employeeId:'001',actualStart:'2026-10-15T11:00',mileage:150,returned:false,confirmPreviousReturned:true});assert.equal(r.status,200);assert.equal(stored.checkInOutLog[0].checkOutTime,null);assert.equal(stored.vehicle[0].vehicleStatus,'IN_USE');
 }finally{global.fetch=originalFetch;global.Date=RealDate}});

test('admin closes an old return without changing a newer trip; repeated repairs accept every vehicle status',async()=>{
 let stored=fixture(),version=1;const originalFetch=global.fetch;
 operate(stored,'checkInOutLog','create',{data:{logId:'new-log',reservationId:'next',vehicleId:'v',employeeId:'001',checkInTime:new Date('2026-10-15T05:00:00Z'),mileageOut:150}});
 stored.reservation[1].reservationStatus='CHECKED_IN';
 global.fetch=async(_,o)=>{const p=JSON.parse(o.body);if(p.action==='read')return Response.json({ok:true,data:{version:String(version),tables:stored}});assert.equal(p.version,String(version));stored={...stored,...p.tables};version++;return Response.json({ok:true,data:{}})};
 const run=b=>POST(new Request('http://localhost',{method:'POST',body:JSON.stringify(b)}));
 try {
  for(const input of [{actualReturn:'2026-02-30T11:00',mileage:140},{actualReturn:'2026-10-15T13:00',mileage:140},{actualReturn:'2026-10-15T11:00',mileage:160},{actualReturn:'2026-10-15T07:00',mileage:140}])assert.equal((await run({type:'ADMIN_RETURN',logId:'old-log',...input})).status,400);
  const vehicleBefore=JSON.stringify(stored.vehicle),nextBefore=JSON.stringify(stored.checkInOutLog[1]);
  assert.equal((await run({type:'ADMIN_RETURN',logId:'old-log',actualReturn:'2026-10-15T11:00',mileage:140,remark:'Confirmed actual return'})).status,200);
  assert.equal(JSON.stringify(stored.vehicle),vehicleBefore);assert.equal(JSON.stringify(stored.checkInOutLog[1]),nextBefore);
  assert.equal(stored.reservation[0].reservationStatus,'COMPLETED');assert.equal(stored.reservation[1].reservationStatus,'CHECKED_IN');
  assert.ok(stored.checkInOutLog[0].remark.includes('[ADMIN_RETURN]'));assert.equal(new Date(stored.checkInOutLog[0].checkOutTime).toISOString(),'2026-10-15T04:00:00.000Z');
  assert.equal((await run({type:'ADMIN_RETURN',logId:'old-log',actualReturn:'2026-10-15T11:00',mileage:140})).status,409);
  assert.equal((await run({type:'ADMIN_RETURN',logId:'missing',actualReturn:'2026-10-15T11:00',mileage:140})).status,404);
  assert.equal((await run({type:'ADMIN_RETURN',logId:'new-log',actualReturn:'bad',mileage:160})).status,400);
  assert.equal((await run({type:'ADMIN_RETURN',logId:'new-log',actualReturn:'2026-10-15T13:00',mileage:160})).status,200);
  assert.equal(stored.vehicle[0].vehicleStatus,'AVAILABLE');
  const maintenance=require('../app/api/maintenance/route.ts').POST;
  for(const status of ['AVAILABLE','IN_USE','MAINTENANCE']){
   stored.vehicle[0].vehicleStatus=status;
   const r=await maintenance(new Request('http://localhost',{method:'POST',body:JSON.stringify({vehicleId:'v',employeeId:'001',mileage:160,issueDesc:'Another issue '+status})}));assert.equal(r.status,201);
  }
  assert.equal(stored.maintenanceTicket.length,3);assert.equal(new Set(stored.maintenanceTicket.map(t=>t.ticketNumber)).size,3);
 }finally{global.fetch=originalFetch}
});
