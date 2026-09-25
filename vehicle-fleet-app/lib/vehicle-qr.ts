export function vehicleUrl(origin: string, vehicleId: string) {
  const base = new URL(origin);
  if (!['https:', 'http:'].includes(base.protocol)) throw new Error('Invalid app URL');
  return new URL(`/vehicle/${encodeURIComponent(vehicleId)}`, base.origin).href;
}

export function vehicleLookup(value: string, origin: string): { vehicleId: string } | { code: string } {
  const input = value.trim();
  if (/^https?:\/\//i.test(input)) {
    const url = new URL(input);
    if (url.origin !== new URL(origin).origin) throw new Error('QR นี้เป็นลิงก์ของระบบอื่น');
    const match = url.pathname.match(/^\/vehicle\/([^/]+)\/?$/);
    if (!match) throw new Error('ลิงก์ QR ไม่ถูกต้อง');
    return { vehicleId: decodeURIComponent(match[1]) };
  }
  return { code: input };
}
