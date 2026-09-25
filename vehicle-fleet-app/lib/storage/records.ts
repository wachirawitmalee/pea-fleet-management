/* eslint-disable @typescript-eslint/no-explicit-any -- Dynamic scalar records and projections at the schema-validated repository boundary. */
import { randomUUID } from 'node:crypto';
import schema from '../../storage-schema.json';

export type Row = Record<string, any>; // Scalar records at the storage boundary.
export type Tables = Record<string, Row[]>;
type Field = { name: string; type: string; kind: string; isRequired: boolean; isList: boolean; isId: boolean; isUnique: boolean; default?: string | number | boolean | { name: string }; relationFromFields?: string[]; relationToFields?: string[]; relationOnDelete?: string };
export const models: { name: string; fields: Field[] }[] = schema;
export const keyOf = (name: string) => name[0].toLowerCase() + name.slice(1);
export const emptyTables = (): Tables => Object.fromEntries(models.map(m => [keyOf(m.name), []]));

export function hydrate(tables: Tables): Tables {
  const result = structuredClone(tables);
  for (const model of models) {
    const rows = result[keyOf(model.name)];
    if (!Array.isArray(rows)) throw new Error(`Missing table: ${model.name}`);
    for (const row of rows) for (const field of model.fields) {
      if (field.type === 'DateTime' && row[field.name] != null) row[field.name] = new Date(row[field.name]);
    }
  }
  return result;
}

function scalar(value: any): any { return value instanceof Date ? value.getTime() : value; }
export function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([key, condition]) => {
    if (key === 'AND') return (Array.isArray(condition) ? condition : [condition]).every(w => matches(row, w));
    if (key === 'OR') return condition.some((w: Row) => matches(row, w));
    if (key === 'NOT') return !matches(row, condition);
    const actual = scalar(row[key]);
    if (condition !== null && typeof condition === 'object' && !(condition instanceof Date)) {
      return Object.entries(condition).every(([op, value]) => {
        const expected = scalar(value);
        switch (op) {
          case 'in': return (value as any[]).includes(actual);
          case 'equals': return actual === expected;
          case 'gte': return actual >= expected;
          case 'lte': return actual <= expected;
          case 'gt': return actual > expected;
          case 'lt': return actual < expected;
          case 'startsWith': return String(actual).startsWith(expected);
          default: throw new Error(`Unsupported filter: ${op}`);
        }
      });
    }
    return actual === scalar(condition);
  });
}

export function validateTables(tables: Tables) {
  for (const model of models) {
    const rows = tables[keyOf(model.name)];
    for (const field of model.fields.filter(f => f.kind !== 'object')) {
      const seen = new Set();
      for (const row of rows) {
        const value = row[field.name];
        if (value == null) { if (field.isRequired) throw new Error(`${model.name}.${field.name} is required`); continue; }
        if (field.type === 'String' && typeof value !== 'string') throw new Error(`Invalid text: ${field.name}`);
        if (['Int', 'Float'].includes(field.type) && (!Number.isFinite(value) || (field.type === 'Int' && !Number.isInteger(value)))) throw new Error(`Invalid number: ${field.name}`);
        if (field.type === 'Boolean' && typeof value !== 'boolean') throw new Error(`Invalid boolean: ${field.name}`);
        if (field.type === 'DateTime' && (!(value instanceof Date) || !Number.isFinite(value.getTime()))) throw new Error(`Invalid date: ${field.name}`);
        if (field.type === 'Role' && !['USER', 'FLEET_ADMIN', 'SYSTEM_ADMIN'].includes(value)) throw new Error('Invalid role');
        if (field.type === 'ReserveStatus' && !['BOOKED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED'].includes(value)) throw new Error('Invalid reservation status');
        if (field.isId || field.isUnique) {
          if (seen.has(value)) throw new Error(`Duplicate ${model.name}.${field.name}`);
          seen.add(value);
        }
      }
    }
    for (const field of model.fields.filter(f => f.kind === 'object' && f.relationFromFields?.length)) {
      const from = field.relationFromFields![0], to = field.relationToFields![0];
      const keys = new Set(tables[keyOf(field.type)].map(r => r[to]));
      for (const row of rows) if (row[from] != null && !keys.has(row[from])) throw new Error(`Missing reference: ${model.name}.${from}`);
    }
  }
}

// Implements only the query operations used by this app. Unsupported operations fail explicitly.
export function operate(tables: Tables, modelKey: string, action: string, args: Row = {}): any {
  const model = models.find(m => keyOf(m.name) === modelKey);
  if (!model) throw new Error(`Unknown model: ${modelKey}`);
  const rows = tables[modelKey];
  const project = (row: Row): Row => {
    const result = { ...row };
    const selectedRelations = Object.fromEntries(Object.entries(args.select || {}).filter(([name]) => model.fields.some(f => f.name === name && f.kind === 'object')));
    for (const [name, options] of Object.entries({ ...args.include, ...selectedRelations })) {
      if (!options) continue;
      const relation = model.fields.find(f => f.name === name && f.kind === 'object');
      if (!relation) throw new Error(`Unknown relation: ${name}`);
      const target = models.find(m => m.name === relation.type)!;
      let where: Row;
      if (relation.relationFromFields?.length) where = { [relation.relationToFields![0]]: row[relation.relationFromFields[0]] };
      else {
        const inverse = target.fields.find(f => f.type === model.name && f.relationFromFields?.length)!;
        where = { [inverse.relationFromFields![0]]: row[inverse.relationToFields![0]] };
      }
      result[name] = operate(tables, keyOf(target.name), relation.isList ? 'findMany' : 'findFirst', { ...(options === true ? {} : options as Row), where });
    }
    if (args.select) return Object.fromEntries(Object.entries(args.select).filter(([, enabled]) => enabled).map(([key]) => [key, result[key]]));
    return result;
  };
  if (['findMany', 'findFirst', 'findUnique'].includes(action)) {
    let found = rows.filter(row => matches(row, args.where));
    const orders = args.orderBy ? (Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy]) : [];
    found.sort((a, b) => {
      for (const order of orders) for (const [key, direction] of Object.entries(order)) {
        const av = scalar(a[key]), bv = scalar(b[key]);
        if (av !== bv) return (av < bv ? -1 : 1) * (direction === 'desc' ? -1 : 1);
      }
      return 0;
    });
    if (args.take !== undefined) found = found.slice(0, args.take);
    return action === 'findMany' ? found.map(project) : found[0] ? project(found[0]) : null;
  }
  const index = rows.findIndex(row => matches(row, args.where));
  if (action === 'upsert') return operate(tables, modelKey, index < 0 ? 'create' : 'update', { where: args.where, data: index < 0 ? args.create : args.update });
  if (action === 'create' || action === 'update') {
    if (action === 'update' && index < 0) throw new Error('Record not found');
    const row: Row = action === 'update' ? { ...rows[index] } : {};
    for (const [key, value] of Object.entries(args.data)) {
      if (!model.fields.some(f => f.name === key && f.kind !== 'object')) throw new Error(`Unknown field: ${key}`);
      if (value !== undefined) row[key] = value;
    }
    for (const field of model.fields.filter(f => f.kind !== 'object')) {
      if (field.name === 'updatedAt') row[field.name] = new Date();
      if (row[field.name] !== undefined) continue;
      const def = field.default;
      if (def !== undefined && typeof def !== 'object') row[field.name] = def;
      else if (def && typeof def === 'object' && 'name' in def) {
        if (def.name.startsWith('uuid')) row[field.name] = randomUUID();
        else if (def.name === 'now') row[field.name] = new Date();
        else throw new Error(`Unsupported default: ${def.name}`);
      }
      else row[field.name] = null;
    }
    if (action === 'create') rows.push(row); else rows[index] = row;
    return project(row);
  }
  if (action === 'delete' || action === 'deleteMany') {
    const removed = rows.filter(row => matches(row, args.where));
    if (action === 'delete' && !removed.length) throw new Error('Record not found');
    tables[modelKey] = rows.filter(row => !removed.includes(row));
    for (const target of models) for (const field of target.fields) {
      if (field.type === model.name && field.relationOnDelete === 'Cascade') {
        const ids = new Set(removed.map(r => r[field.relationToFields![0]]));
        tables[keyOf(target.name)] = tables[keyOf(target.name)].filter(r => !ids.has(r[field.relationFromFields![0]]));
      }
    }
    return action === 'deleteMany' ? { count: removed.length } : project(removed[0]);
  }
  throw new Error(`Unsupported storage operation: ${action}`);
}
