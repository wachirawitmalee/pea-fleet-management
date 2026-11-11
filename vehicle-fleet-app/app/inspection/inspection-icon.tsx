export type InspectionIconName = 'car' | 'check' | 'alert' | 'clock' | 'chart' | 'filter' | 'list' | 'qr';

const paths: Record<InspectionIconName, string> = {
  car: 'M5 17H3v-5l2-5a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 5v5h-2m-14 0v2m14-2v2M5 17h14M3 12h18M7 14.5h1m8 0h1',
  check: 'M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  alert: 'M12 8v5m0 3h.01M10.3 4.9 3.2 17a2 2 0 0 0 1.7 3h14.2a2 2 0 0 0 1.7-3L13.7 4.9a2 2 0 0 0-3.4 0Z',
  clock: 'M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  chart: 'M4 4v16h16M8 16v-4m5 4V8m5 8V5',
  filter: 'M4 7h16M7 12h10m-7 5h4',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  qr: 'M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zm12 0h3v3h3v3h-6zm6 0h.01',
};

export default function InspectionIcon({ name, className = 'size-5' }: { name: InspectionIconName; className?: string }) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>;
}
