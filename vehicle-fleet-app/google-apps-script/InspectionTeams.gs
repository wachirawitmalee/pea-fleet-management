/** Inspection notifications. Script properties: INSPECTION_TEAMS_URL and INSPECTION_TEAMS_SINCE. */
function inspectionTeamsCard_(title, subtitle, facts, groups) {
  const block = (text, extra) => Object.assign({type:'TextBlock',text:String(text),wrap:true},extra || {});
  return {type:'message',attachments:[{contentType:'application/vnd.microsoft.card.adaptive',contentUrl:null,content:{
    $schema:'http://adaptivecards.io/schemas/adaptive-card.json',type:'AdaptiveCard',version:'1.2',
    body:[block(title,{size:'Large',weight:'Bolder',color:'Accent'}),block(subtitle,{isSubtle:true,spacing:'Small'}),
      {type:'FactSet',facts:facts.map(([title,value])=>({title,value:String(value)}))}].concat(groups.map(([label,lines])=>({
        type:'Container',separator:true,items:[block(label,{weight:'Bolder',color:'Accent'}),block(lines,{spacing:'Small'})]
      }))),
    actions:[{type:'Action.OpenUrl',title:'เปิดแดชบอร์ด Inspection',url:'https://pea-fleet-management.vercel.app/inspection'}]
  }}]};
}

function inspectionTeamsFleet_(tables) {
  const allowed=['กฟส.ระโนด','กฟส.สทิงพระ','กฟส.กระแสสินธ์'];
  const settings=new Map(tables.systemSetting.map(s=>[s.id,s.alertEmail]));
  return tables.vehicle.filter(v=>settings.has('inspection-vehicle:'+v.vehicleId)).map(v=>{
    const branch=settings.get('vehicle-branch:'+v.vehicleId);
    return {id:v.vehicleId,plate:v.plateNumber,branch:allowed.includes(branch)?branch:allowed[0]};
  });
}

function inspectionTeamsDailyCard_(day, fleet, records) {
  const checked=new Set(records.filter(r=>r.kind==='vehicle'&&r.date===day).map(r=>r.vehicleId));
  const done=fleet.filter(v=>checked.has(v.id)).length;
  const groups=['กฟส.ระโนด','กฟส.สทิงพระ','กฟส.กระแสสินธ์'].map(branch=>{
    const vehicles=fleet.filter(v=>v.branch===branch), missing=vehicles.filter(v=>!checked.has(v.id));
    return ['🚙 '+branch,'ตรวจแล้ว '+(vehicles.length-missing.length)+' / '+vehicles.length+' คัน\n⏳ ยังไม่ตรวจ '+missing.length+' คัน'+(missing.length?'\n'+missing.map(v=>v.plate).join(', '):'')];
  });
  return inspectionTeamsCard_('📋 สรุปตรวจสภาพรถช่วงบ่าย',day+' · นับรถไม่ซ้ำ เฉพาะรถที่เข้าร่วม Inspection',
    [['✅ ตรวจแล้ว',done+' คัน'],['⏳ ยังไม่ตรวจ',(fleet.length-done)+' คัน']],groups);
}

function inspectionTeamsEventCard_(r, branch) {
  return inspectionTeamsCard_(r.kind==='vehicle'?'🚙 บันทึกผลตรวจสภาพรถ':'🛠️ บันทึกผลตรวจก่อนเริ่มงาน',
    branch+' · '+r.date,[['ทะเบียน',r.plate],['ผลตรวจ',r.ready?'✅ พร้อม':'⚠️ พบปัญหา']].concat(r.kind==='pre-job'?[['การอนุมัติ','รออนุมัติเมื่อบันทึก']]:[]),
    r.failures.length?[['ข้อที่ต้องติดตาม',r.failures.join(' · ')]]:[]);
}

function inspectionTeamsSend_(props, id, card) {
  const url=props.getProperty('INSPECTION_TEAMS_URL');
  if (!url || !/^https:\/\/[a-z0-9.-]+\.api\.powerplatform\.com(?::443)?\/powerautomate\//.test(url)) return;
  const key='INSP_SENT_'+hash_(id), lock=LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {if(props.getProperty(key))return;props.setProperty(key,'sending');} finally {lock.releaseLock();}
  try {
    const r=UrlFetchApp.fetch(url,{method:'post',contentType:'application/json',payload:JSON.stringify(card),muteHttpExceptions:true,followRedirects:false});
    if (r.getResponseCode()>=200&&r.getResponseCode()<300) props.setProperty(key,new Date().toISOString());
    else props.deleteProperty(key); // explicit rejection can be retried
  } catch (_) { console.error('Inspection Teams delivery unknown; not retried automatically'); }
}

function inspectionTeamsNotify_(recordId, props) {
  try {
    if (!props.getProperty('INSPECTION_TEAMS_SINCE') || !props.getProperty('INSPECTION_TEAMS_URL')) return;
    const record=JSON.parse(inspection_({action:'inspection-detail',id:recordId},props).getContent()).data;
    if (!record || record.createdAt<props.getProperty('INSPECTION_TEAMS_SINCE')) return;
    const fleet=inspectionTeamsFleet_(read_(props.getProperty('SPREADSHEET_ID')).tables);
    const car=fleet.find(v=>v.id===record.vehicleId);
    if(car) inspectionTeamsSend_(props,'event:'+record.id,inspectionTeamsEventCard_(record,car.branch));
  } catch (_) { console.error('Inspection Teams notification deferred'); }
}

function inspectionTeamsTick() {
  const props=PropertiesService.getScriptProperties(), since=props.getProperty('INSPECTION_TEAMS_SINCE');
  if(!since||!props.getProperty('INSPECTION_TEAMS_URL'))return;
  const id=props.getProperty('SPREADSHEET_ID'), now=new Date(), day=Utilities.formatDate(now,'Asia/Bangkok','yyyy-MM-dd');
  const hour=Utilities.formatDate(now,'Asia/Bangkok','HH:mm');
  const fleet=inspectionTeamsFleet_(read_(id).tables);
  const vehicles=new Map(fleet.map(v=>[v.id,v]));
  const sheet=SpreadsheetApp.openById(id).getSheetByName('InspectionRecords');
  const records=sheet&&sheet.getLastRow()>1?sheet.getRange(2,3,sheet.getLastRow()-1,1).getValues().map(r=>JSON.parse(r[0])):[];
  if(hour>='14:00'&&hour<'15:00')inspectionTeamsSend_(props,'daily:'+day,inspectionTeamsDailyCard_(day,fleet,records));
  const recent=new Date(now.getTime()-2*86400000).toISOString();
  records.filter(r=>r.createdAt>=since&&r.createdAt>=recent&&vehicles.has(r.vehicleId)).slice(-100).forEach(r=>{
    inspectionTeamsSend_(props,'event:'+r.id,inspectionTeamsEventCard_(r,vehicles.get(r.vehicleId).branch));
  });
  const cutoff=new Date(now.getTime()-7*86400000).toISOString();
  Object.entries(props.getProperties()).forEach(([k,v])=>{if(k.startsWith('INSP_SENT_')&&v!=='sending'&&v<cutoff)props.deleteProperty(k);});
}

function enableInspectionTeams() {
  const props=PropertiesService.getScriptProperties();
  if(!props.getProperty('INSPECTION_TEAMS_URL'))throw Error('Set INSPECTION_TEAMS_URL first');
  if(!props.getProperty('INSPECTION_TEAMS_SINCE'))props.setProperty('INSPECTION_TEAMS_SINCE',new Date().toISOString());
  if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='inspectionTeamsTick'))ScriptApp.newTrigger('inspectionTeamsTick').timeBased().everyMinutes(5).create();
}
