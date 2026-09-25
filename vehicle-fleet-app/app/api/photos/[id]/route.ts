import { googleCall } from '@/lib/storage/google';
import { validPhotoSignature } from '@/lib/storage/photos';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    if (!/^[\w-]+$/.test(id) || !validPhotoSignature(id, new URL(request.url).searchParams.get('signature') || '')) return new Response('Not found', { status: 404 });
    const image = await googleCall<{ data: string; mimeType: string }>('photo', { id });
    if (!/^image\/(jpeg|png|webp)$/.test(image.mimeType)) return new Response('Not found', { status: 404 });
    return new Response(Buffer.from(image.data, 'base64'), { headers: { 'Content-Type': image.mimeType, 'Cache-Control': 'private, max-age=86400', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } });
  } catch { return new Response('Image unavailable', { status: 503 }); }
}
