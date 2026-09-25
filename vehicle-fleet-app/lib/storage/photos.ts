import { createHmac, timingSafeEqual } from 'node:crypto';
import { googleCall } from './google';

function signature(id: string) {
  const secret = process.env.GOOGLE_STORAGE_SECRET;
  if (!secret || secret.length < 32) throw new Error('Missing photo signing secret');
  return createHmac('sha256', secret).update(`fleet-photo:${id}`).digest('hex');
}
export function photoUrl(id: string) { return `/api/photos/${id}?signature=${signature(id)}`; }
export function validPhotoSignature(id: string, value: string) {
  if (!/^[a-f0-9]{64}$/.test(value)) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(signature(id)));
}
export async function storePhoto(value: unknown): Promise<string | null> {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') throw new Error('Invalid image');
  if (/^\/api\/photos\/[\w-]+\?signature=[a-f0-9]{64}$/.test(value)) {
    const url = new URL(value, 'https://fleet.invalid');
    if (!validPhotoSignature(url.pathname.split('/').pop()!, url.searchParams.get('signature')!)) throw new Error('Invalid image signature');
    return value;
  }
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value) || value.length > 7_000_000) throw new Error('รองรับรูป JPEG, PNG, WebP ขนาดไม่เกิน 5 MB');
  // Existing PostgreSQL deployments keep working until Google is configured.
  if (process.env.PHOTO_BACKEND !== 'google-drive' && process.env.DATA_BACKEND !== 'google-sheets') return value;
  const uploaded = await googleCall<{ id: string }>('upload', { data: value });
  return photoUrl(uploaded.id);
}
