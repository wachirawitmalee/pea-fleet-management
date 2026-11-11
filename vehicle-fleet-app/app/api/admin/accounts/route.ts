import { adminFromRequest, grantId, makeAdminHash } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { withStorage } from '@/lib/storage/sheets';
const reply = (data:unknown,status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request) {
  if ((await adminFromRequest(request))?.role !== 'super') return reply({error:'เฉพาะแอดมินสูงสุด'},403);
  const [grants,employees]=await Promise.all([prisma.systemSetting.findMany({where:{id:{startsWith:grantId('')}},select:{id:true}}),prisma.employee.findMany({where:{status:'ACTIVE'},select:{employeeId:true,fullName:true,workPlace:true}})]);
  const enabled=new Set(grants.map(g=>g.id.slice(grantId('').length)));
  return reply(employees.map(e=>({...e,enabled:enabled.has(e.employeeId)})));
}
export const POST=withStorage(async (request:Request)=>{
  if ((await adminFromRequest(request))?.role !== 'super') return reply({error:'เฉพาะแอดมินสูงสุด'},403);
  const {employeeId,password,enabled}=await request.json();
  if (typeof employeeId!=='string'||!/^[\w-]{1,48}$/.test(employeeId)||employeeId==='admin'||typeof enabled!=='boolean') return reply({error:'เลือกรหัสพนักงานที่ถูกต้อง'},400);
  const id=grantId(employeeId);
  if (!enabled) {await prisma.systemSetting.deleteMany({where:{id}});return reply({ok:true});}
  const emp=await prisma.employee.findUnique({where:{employeeId}});
  if (emp?.status!=='ACTIVE'||typeof password!=='string'||password.length<10||password.length>128||password===employeeId) return reply({error:'เลือกพนักงานที่ใช้งานอยู่และตั้งรหัสผ่าน 10–128 ตัวอักษรที่ต่างจากรหัสพนักงาน'},400);
  const alertEmail=makeAdminHash(password);
  await prisma.systemSetting.upsert({where:{id},create:{id,alertEmail},update:{alertEmail}});
  return reply({ok:true});
});
