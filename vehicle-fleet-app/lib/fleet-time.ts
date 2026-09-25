export function bookingTime(date: Date | string, time: string): Date {
  const day = new Date(date).toISOString().slice(0, 10);
  return new Date(`${day}T${time || '00:00'}:00+07:00`);
}
export function bangkokMonth(date: Date | string): string {
  const d = new Date(date);
  return new Date(d.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 7);
}
