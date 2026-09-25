export class GoogleStorageError extends Error {
  constructor(message: string, public code: string) { super(message); }
}

export async function googleCall<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  const secret = process.env.GOOGLE_STORAGE_SECRET;
  if (!url || !secret || secret.length < 32) throw new GoogleStorageError('Google storage configuration is missing', 'CONFIG');
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url)) throw new GoogleStorageError('Invalid Apps Script deployment URL', 'CONFIG');
  // Never retry a timed-out write: the remote commit may already have succeeded.
  const response = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, action, ...payload }), cache: 'no-store',
    signal: AbortSignal.timeout(55_000), redirect: 'follow',
  });
  if (!response.ok) throw new GoogleStorageError('Google storage unavailable', 'UPSTREAM');
  const envelope = await response.json();
  if (!envelope.ok) throw new GoogleStorageError(envelope.error || 'Google storage failed', envelope.code || 'UPSTREAM');
  return envelope.data as T;
}
