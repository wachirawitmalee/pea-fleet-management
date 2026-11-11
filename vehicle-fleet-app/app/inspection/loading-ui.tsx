export function Spinner() {
  return <span aria-hidden="true" className="inline-block size-4 shrink-0 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin" />;
}

export function InspectionSkeleton({ compact = false }: { compact?: boolean }) {
  return <div role="status" aria-label="กำลังโหลดข้อมูล" className={compact ? 'space-y-3 p-4' : 'space-y-4 rounded-3xl border border-indigo-100 bg-white p-5 sm:p-7'}>
    <div aria-hidden="true" className="motion-safe:animate-pulse">
      {!compact && <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-indigo-100"><div className="inspection-loading-slide h-full w-1/3 rounded-full bg-gradient-to-r from-violet-500 to-teal-400" /></div>}
      <div className={compact ? 'space-y-3' : 'grid gap-4 sm:grid-cols-3'}>
        {[0,1,2].map(i => compact ? <div key={i} className="h-4 rounded-full bg-indigo-100" style={{width: (85 - i * 12)+'%'}} /> : <div key={i} className="rounded-2xl bg-slate-50 p-4"><div className="h-3 w-1/2 rounded-full bg-indigo-100" /><div className="mt-3 h-8 w-16 rounded-lg bg-indigo-100" /></div>)}
      </div>
    </div>
    {!compact && <p className="text-sm font-medium text-slate-600">กำลังโหลดผลตรวจ…</p>}
  </div>;
}
