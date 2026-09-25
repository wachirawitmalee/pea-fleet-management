// Resize on the device before sending: avoids multi-megabyte base64 request bodies.
export async function preparePhoto(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('กรุณาใช้รูป JPEG, PNG หรือ WebP');
  if (file.size > 20 * 1024 * 1024) throw new Error('รูปภาพต้องมีขนาดไม่เกิน 20 MB');
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('ไม่สามารถเตรียมรูปภาพได้');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL('image/jpeg', 0.8);
    if (result.length > 3_000_000) throw new Error('รูปภาพมีขนาดใหญ่เกินไป กรุณาลดขนาดภาพ');
    return result;
  } finally { bitmap.close(); }
}
