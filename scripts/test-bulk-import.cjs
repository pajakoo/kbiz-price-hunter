const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
require('dotenv').config();

const base = new URL(process.env.DATABASE_URL);
assert(['localhost', '127.0.0.1'].includes(base.hostname), 'Local DB required');
const database = `ph_import_test_${randomUUID().replaceAll('-', '')}`;
const url = new URL(base); url.pathname = `/${database}`;
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ph-import-test-'));
const env = { ...process.env, DATABASE_URL: url.toString() };
const admin = new Client({ connectionString: base.toString() });
const db = new Client({ connectionString: url.toString() });
function run(command, args, expected = 0) {
  const result = spawnSync(command, args, { env, encoding: 'utf8' });
  assert.equal(result.status, expected, `${command} failed: ${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
function importAll(expected = 0) {
  return run('npx', ['ts-node', '--files', '--compiler-options', '{"module":"CommonJS"}',
    'scripts/bulk-import-csv.ts', '--path', temp, '--currency', 'EUR'], expected);
}
async function counts(prices, batches) {
  assert.equal(Number((await db.query('SELECT COUNT(*) FROM "Price"')).rows[0].count), prices);
  assert.equal(Number((await db.query('SELECT COUNT(*) FROM "CsvImportBatch"')).rows[0].count), batches);
}
(async () => {
  await admin.connect();
  await admin.query(`CREATE DATABASE "${database}"`);
  try {
    run('npx', ['prisma', 'migrate', 'deploy']);
    await db.connect();
    run('python3', ['-c', `import zipfile,sys
from pathlib import Path
root=Path(sys.argv[1])
header='Населено място,Търговски обект,Наименование на продукта,Код на продукта,Цена на дребно,Цена в промоция\\n'
for date in ['2026-01-16','2026-10-14']:
 with zipfile.ZipFile(root/(date+'.zip'),'w') as z:
  name='Milk 400g' if date=='2026-01-16' else 'Milk renamed 400g'
  z.writestr('supplier.csv',header+'10135,Store,'+name+',123,2.50,0\\n')
`, temp]);
    await db.query(`CREATE FUNCTION fail_later_batch() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW."recordedAt"::date = '2026-10-14' THEN RAISE EXCEPTION 'injected failure'; END IF;
      RETURN NEW; END $$;
      CREATE TRIGGER fail_later BEFORE INSERT ON "Price" FOR EACH ROW EXECUTE FUNCTION fail_later_batch()`);
    importAll(1);
    await counts(1, 1);
    await db.query('DROP TRIGGER fail_later ON "Price"');
    await db.query(`UPDATE "Product" SET description='Curated description',categories=ARRAY['reviewed']`);
    importAll();
    await counts(2, 2);
    importAll();
    await counts(2, 2);
    fs.renameSync(path.join(temp, '2026-01-16.zip'), path.join(temp, 'renamed_2026-01-16.zip'));
    importAll();
    await counts(2, 2);
    const products = await db.query('SELECT description,categories FROM "Product"');
    assert.equal(products.rows.length, 1);
    assert.equal(products.rows[0].description, 'Curated description');
    assert.deepEqual(products.rows[0].categories, ['reviewed']);
    assert.equal((await db.query('SELECT amount FROM "Price" LIMIT 1')).rows[0].amount, 2.5);
    run('python3', ['-c', `import zipfile,sys
p=sys.argv[1]
with zipfile.ZipFile(p) as z: data=z.read('supplier.csv')
with zipfile.ZipFile(p,'w') as z: z.writestr('supplier.csv',data.replace(b'2.50',b'9.00'))
`, path.join(temp, '2026-10-14.zip')]);
    importAll(1);
    await counts(2, 2);
    console.log('PASS: migration, rollback, resume, rerun, renamed ZIP, zero-promo fallback, editorial preservation, changed-file rejection');
  } finally {
    await db.end();
    await admin.query(`DROP DATABASE "${database}"`);
  }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await admin.end(); fs.rmSync(temp, { recursive: true, force: true });
});
