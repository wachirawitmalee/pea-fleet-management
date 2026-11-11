import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { prisma } from './prisma';

export const adminCookie = 'fleet-admin';
export const grantId = (id: string) => 'admin-grant:' + id;
const signingKey = () => process.env.FLEET_SESSION_SECRET ?? process.env.GOOGLE_STORAGE_SECRET;
const sign = (value: string) => createHmac('sha256', signingKey()!).update(value).digest('base64url');
const equal = (a: string,b: string) => Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a),Buffer.from(b));
export const previewMode = () => process.env.NODE_ENV === 'development' && process.env.FLEET_LOCAL_PREVIEW === 'true';
export function makeAdminHash(password: string) {
  const salt = randomBytes(16).toString('hex');
  return salt+':'+scryptSync(password,salt,32).toString('hex');
}
export async function loginAdmin(id: string, password: string) {
  if (!signingKey() || !/^[\w-]{1,48}$/.test(id) || password.length > 128) return null;
  const superPassword = process.env.FLEET_SUPER_ADMIN_PASSWORD ?? (previewMode() ? '1234' : '');
  if (id === 'admin') return superPassword && equal(password,superPassword) ? {id,role:'super' as const, version:sign('super:'+superPassword)} : null;
  const [grant,employee] = await Promise.all([prisma.systemSetting.findUnique({where:{id:grantId(id)}}),prisma.employee.findUnique({where:{employeeId:id}})]);
  if (employee?.status !== 'ACTIVE' || !grant?.alertEmail) return null;
  const [salt, hash] = grant.alertEmail.split(':');
  if (!salt || !hash || !equal(scryptSync(password,salt,32).toString('hex'),hash)) return null;
  return {id,role:'admin' as const,version:sign(grant.alertEmail)};
}
type Identity = {id:string;role:'super'|'admin';version:string};
export function issueAdmin(identity: Identity) {
  const value = Buffer.from(JSON.stringify({...identity,exp:Date.now()+8*3600000})).toString('base64url');
  return value+'.'+sign(value);
}
export async function readAdmin(cookie?: string) {
  if (!cookie || !signingKey()) return null;
  try {
    const [value, signature] = cookie.split('.');
    if (!value || !signature || !equal(sign(value),signature)) return null;
    const auth = JSON.parse(Buffer.from(value,'base64url').toString()) as Identity & {exp:number};
    if (auth.exp <= Date.now()) return null;
    if (auth.role === 'super' && auth.id === 'admin') {
      const password = process.env.FLEET_SUPER_ADMIN_PASSWORD ?? (previewMode() ? '1234' : '');
      return password && equal(auth.version,sign('super:'+password)) ? auth : null;
    }
    if (auth.role !== 'admin') return null;
    const [grant,employee] = await Promise.all([prisma.systemSetting.findUnique({where:{id:grantId(auth.id)}}),prisma.employee.findUnique({where:{employeeId:auth.id}})]);
    return employee?.status === 'ACTIVE' && grant?.alertEmail && equal(auth.version,sign(grant.alertEmail)) ? auth : null;
  } catch { return null; }
}
export function adminFromRequest(request: Request) {
  return readAdmin(request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(adminCookie+'='))?.slice(adminCookie.length+1));
}
