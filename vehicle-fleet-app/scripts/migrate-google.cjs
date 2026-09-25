require('dotenv').config({ quiet: true });
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { PrismaClient } = require('@prisma/client');
const { mkdir, writeFile } = require('node:fs/promises');
const { models, keyOf, hydrate, validateTables } = require('../lib/storage/records.ts');
const { googleCall } = require('../lib/storage/google.ts');
const { storePhoto } = require('../lib/storage/photos.ts');

async function main() {
  const apply = process.argv.includes('--apply');
  const db = new PrismaClient();
  let tables;
  try {
    const records = await db.$transaction(models.map(m => db[keyOf(m.name)].findMany()), { isolationLevel: 'RepeatableRead' });
    tables = Object.fromEntries(models.map((m, i) => [keyOf(m.name), records[i]]));
  } finally { await db.$disconnect(); }
  validateTables(tables);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  await mkdir('backups', { recursive: true });
  await writeFile(`backups/postgres-${stamp}.json`, JSON.stringify(tables, null, 2), { flag: 'wx' });
  console.log('Source snapshot backed up. Counts:', Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.length])));
  if (!apply) { console.log('Dry run complete. No Google data changed. Stop application writes before running with --apply.'); return; }
  const destination = await googleCall('read');
  if (Object.values(destination.tables).some(rows => rows.length)) throw new Error('Destination is not empty. Refusing to overwrite existing data.');
  process.env.PHOTO_BACKEND = 'google-drive';
  for (const log of tables.checkInOutLog) {
    for (const field of ['photoOutUrl', 'photoInUrl']) {
      let photo = log[field];
      if (!photo) continue;
      if (photo.startsWith('https://')) {
        const url = new URL(photo);
        if (!url.hostname.endsWith('.supabase.co') || !url.pathname.startsWith('/storage/v1/object/')) throw new Error('Unsupported legacy photo host. Review and migrate this image separately.');
        const response = await fetch(photo, { redirect: 'error', signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw new Error('Legacy photo download failed');
        const type = (response.headers.get('content-type') || '').split(';')[0];
        if (!/^image\/(jpeg|png|webp)$/.test(type)) throw new Error('Unsupported legacy image format');
        const chunks = []; let length = 0;
        for await (const chunk of response.body) { length += chunk.length; if (length > 5 * 1024 * 1024) throw new Error('Legacy photo exceeds 5 MB'); chunks.push(chunk); }
        photo = `data:${type};base64,${Buffer.concat(chunks).toString('base64')}`;
      }
      log[field] = await storePhoto(photo);
    }
  }
  validateTables(tables);
  await writeFile(`backups/google-${stamp}.json`, JSON.stringify(tables, null, 2), { flag: 'wx' });
  await googleCall('commit', { version: destination.version, tables });
  const verified = hydrate((await googleCall('read')).tables);
  validateTables(verified);
  // Compare every scalar value by primary key, accounting for optional empty cells.
  for (const model of models) {
    const key = keyOf(model.name), id = model.fields.find(f => f.isId).name;
    const actual = new Map(verified[key].map(r => [r[id], r]));
    if (actual.size !== tables[key].length) throw new Error(`Count mismatch: ${key}`);
    for (const row of tables[key]) for (const field of model.fields.filter(f => f.kind !== 'object')) {
      const normalize = value => value instanceof Date ? value.toISOString() : value === '' && !field.isRequired ? null : value;
      if (normalize(row[field.name]) !== normalize(actual.get(row[id])?.[field.name])) throw new Error(`Verification failed: ${key}.${field.name}`);
    }
  }
  console.log('Verified all records and fields. Source PostgreSQL data has not been modified. Google backend can now be enabled.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
