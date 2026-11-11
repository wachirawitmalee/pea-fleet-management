import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { emptyTables, operate, type Tables } from './records';
import { branches } from '../fleet-branches';

type RecordEntry = {id:string;vehicleId:string;kind:string;date:string;createdAt:string;ready:boolean;failures:string[];inspector:{id:string;name:string};approval:string|null;photoId?:string;[key:string]:unknown};
type Preview = {version:string;tables:Tables;inspections:RecordEntry[];photos:Record<string,string>};
const folder=resolve('backups');
const file=resolve(folder,'fleet-preview-local.json');
export function localPreviewEnabled() {
  return process.env.NODE_ENV === 'development' && process.env.FLEET_LOCAL_PREVIEW === 'true';
}
function initial(): Preview {
  const tables=emptyTables();
  for (let i=1;i<=6;i++) {
    operate(tables,'vehicle','create',{data:{vehicleId:'demo-car-'+i,plateNumber:'ทดลอง '+String(1000+i),brand:i%2?'Toyota':'Isuzu',type:'รถยนต์',qrCodeData:'demo-'+i,currentMileage:50000+i}});
    operate(tables,'systemSetting','create',{data:{id:'inspection-vehicle:demo-car-'+i}});
    if(i>2)operate(tables,'systemSetting','create',{data:{id:'vehicle-branch:demo-car-'+i,alertEmail:branches[Math.floor((i-1)/2)]}});
  }
  for(let i=1;i<=4;i++)operate(tables,'employee','create',{data:{employeeId:'90000'+i,fullName:'ผู้ตรวจตัวอย่าง '+i,position:'ช่าง',department:'ปฏิบัติการ',workPlace:i===1?'ระโนด':branches[(i-1)%3],status:'ACTIVE'}});
  const now=new Date(), day=new Date(now.getTime()+7*3600000).toISOString().slice(0,10);
  const inspections:RecordEntry[]=[1,2,3,4].map((i)=>({id:'demo-report-'+i,vehicleId:'demo-car-'+i,kind:'vehicle',date:day,createdAt:now.toISOString(),plate:'ทดลอง '+(1000+i),category:'รถยนต์',ready:i!==2,failures:i===2?['ไฟเบรก']:[],approval:null,inspector:{id:i===4?'900002':'900001',name:i===4?'ผู้ตรวจตัวอย่าง 2':'ผู้ตรวจตัวอย่าง 1'},answers:{mileage:50000+i},note:''}));
  return {version:randomUUID(),tables,inspections,photos:{}};
}
function write(data:Preview) {
  mkdirSync(folder,{recursive:true});const tmp=file+'.'+randomUUID()+'.tmp';writeFileSync(tmp,JSON.stringify(data),'utf8');renameSync(tmp,file);
}
export function localGoogleCall<T>(action:string,p:Record<string,unknown>): T {
  if (!localPreviewEnabled()) throw Error('Preview disabled');
  const s:Preview=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):initial();
  if(!existsSync(file))write(s);
  const result = (x: unknown) => x as T;
  if(action==='read')return result({version:s.version,tables:s.tables});
  if(action==='commit'){
    if(s.version!==p.version){const err=Object.assign(new Error('Preview changed'),{code:'CONFLICT'});throw err;}
    s.tables={...s.tables,...p.tables as Tables};s.version=randomUUID();write(s);return result({committed:true});
  }
  if(action==='inspection-summary')return result(s.inspections.filter(x=>x.date.startsWith(String(p.period))).map(({inspector,photoId,answers,note,decision,...summary})=>summary));
  if(action==='inspection-ranking'){
    const counts=new Map<string,{name:string;count:number}>();
    for(const x of s.inspections)if(x.date.startsWith(String(p.period))&&x.kind===p.kind&&(p.vehicleIds as string[]).includes(x.vehicleId)){
      const row=counts.get(x.inspector.id)??{name:x.inspector.name,count:0};row.count++;counts.set(x.inspector.id,row);
    }
    return result([...counts.values()]);
  }
  if(action==='inspection-detail')return result(s.inspections.find(x=>x.id===p.id)??null);
  if(action==='inspection-save'){
    const record=p.record as RecordEntry;
    const existing=s.inspections.find(x=>x.id===record.id);
    if(existing)return result({id:existing.id,ready:existing.ready,approval:existing.approval});
    if(typeof p.photo==='string'){record.photoId=record.id;s.photos[record.id]=p.photo;}
    s.inspections.push(record);write(s);return result({id:record.id,ready:record.ready,approval:record.approval});
  }
  if(action==='inspection-photo'){
    const photo=s.photos[String(p.id)], m=/^data:([^;]+);base64,(.+)$/.exec(photo||'');
    if(m)return result({mime:m[1],data:m[2]});
  }
  if(action==='inspection-decide'){
    const x=s.inspections.find(x=>x.id===p.id);
    if(!x||x.kind!=='pre-job'||x.approval!=='pending'||x.inspector.id===p.by||(p.decision==='approved'&&!x.ready))throw Object.assign(Error('State changed'),{code:'CONFLICT'});
    x.approval=String(p.decision);x.decision={by:p.by,note:p.note,at:new Date().toISOString()};write(s);return result({ok:true});
  }
  throw Error('Unsupported preview action: '+action);
}
