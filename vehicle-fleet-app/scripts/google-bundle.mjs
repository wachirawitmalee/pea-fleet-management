import { readFile, writeFile } from 'node:fs/promises';
const schema = JSON.parse(await readFile(new URL('../storage-schema.json', import.meta.url), 'utf8'));
await writeFile(new URL('../google-apps-script/Schema.gs', import.meta.url), '// Generated from storage-schema.json.\nconst FLEET_SCHEMA = ' + JSON.stringify(schema) + ';\n');
console.log('Generated google-apps-script/Schema.gs');
