import { AsyncLocalStorage } from 'node:async_hooks';
import type { PrismaClient } from '@prisma/client';
import { googleCall, GoogleStorageError } from './google';
import { hydrate, keyOf, models, operate, validateTables, type Tables } from './records';

type Snapshot = { version: string; tables: Tables };
type Context = Snapshot & { dirty: boolean };
const context = new AsyncLocalStorage<Context>();
let cache: { snapshot: Snapshot; expires: number } | undefined;
let inflight: Promise<Snapshot> | undefined;
let generation = 0;

async function snapshot(fresh = false): Promise<Snapshot> {
  if (fresh) return googleCall<Snapshot>('read');
  if (cache && cache.expires > Date.now()) return cache.snapshot;
  if (!inflight) {
    const currentGeneration = generation;
    inflight = googleCall<Snapshot>('read').then(result => {
      if (currentGeneration === generation) cache = { snapshot: result, expires: Date.now() + 10_000 };
      return result;
    }).finally(() => { inflight = undefined; });
  }
  return inflight;
}

// The typed facade intentionally supports only the methods implemented by operate().
const delegates = Object.fromEntries(models.map(model => [keyOf(model.name), Object.fromEntries(
  ['findMany', 'findUnique', 'findFirst', 'create', 'update', 'upsert', 'delete', 'deleteMany'].map(action => [action, async (args: Record<string, unknown>) => {
    const active = context.getStore();
    const write = !action.startsWith('find');
    if (write && !active) throw new Error('Sheets writes require withStorage()');
    const tables = active?.tables ?? hydrate((await snapshot()).tables);
    const result = operate(tables, keyOf(model.name), action, args);
    if (write && active) active.dirty = true;
    return result;
  }])
)]));
export const sheetsClient = {
  ...delegates,
  $transaction: async (operations: Promise<unknown>[]) => {
    if (!context.getStore()) throw new Error('Sheets transactions require withStorage()');
    if (!Array.isArray(operations)) throw new Error('Only array transactions are supported');
    return Promise.all(operations);
  },
} as unknown as PrismaClient;

export function withStorage<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    if (process.env.DATA_BACKEND !== 'google-sheets') return handler(...args);
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const source = await snapshot(true);
        const active: Context = { version: source.version, tables: hydrate(source.tables), dirty: false };
        // A cloned request permits safe retries after a rejected compare-and-swap.
        const cloned = args.map(a => a instanceof Request ? a.clone() : a) as A;
        const response = await context.run(active, () => handler(...cloned));
        if (!response.ok || !active.dirty) return response;
        validateTables(active.tables);
        const changed = Object.fromEntries(Object.entries(active.tables).filter(([key, rows]) => JSON.stringify(rows) !== JSON.stringify(source.tables[key])));
        try {
          await googleCall('commit', { version: source.version, tables: changed });
          generation++; cache = undefined;
          return response;
        } catch (error) {
          generation++; cache = undefined;
          if (error instanceof GoogleStorageError && error.code === 'CONFLICT' && attempt < 2) continue;
          throw error;
        }
      }
    } catch (error) {
      console.error('Storage operation failed:', error instanceof Error ? error.message : 'unknown');
      return Response.json({ error: 'บันทึกไม่สำเร็จ กรุณารีเฟรชเพื่อตรวจสอบข้อมูลก่อนลองใหม่' }, { status: error instanceof GoogleStorageError && error.code === 'CONFLICT' ? 409 : 503 });
    }
    return Response.json({ error: 'ข้อมูลมีการเปลี่ยนแปลง กรุณาลองใหม่' }, { status: 409 });
  };
}
