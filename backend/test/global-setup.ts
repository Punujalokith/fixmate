// Runs once before the e2e tests: prepares a separate test database so your dev data is never touched.
import { execSync } from 'node:child_process';
import pg from 'pg';
import { TEST_DATABASE_URL } from './test-env.js';

export default async function setup() {
  const url = new URL(TEST_DATABASE_URL);
  const dbName = url.pathname.slice(1);
  if (!dbName.endsWith('_test')) throw new Error(`Refusing to reset "${dbName}": test database name must end with _test`);

  // 1. Create the test database if it doesn't exist.
  const admin = new pg.Client({ connectionString: TEST_DATABASE_URL.replace(`/${dbName}`, '/postgres') });
  await admin.connect();
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (!exists.rowCount) await admin.query(`CREATE DATABASE "${dbName}"`);
  await admin.end();

  const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL };

  // 2. Apply migrations.
  execSync('npx prisma migrate deploy', { env, stdio: 'pipe' });

  // 3. Empty every table, then load the demo seed.
  const db = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await db.connect();
  const { rows } = await db.query<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'",
  );
  if (rows.length) await db.query(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(', ')} CASCADE`);
  await db.end();

  execSync('npx tsx prisma/seed.ts', { env, stdio: 'pipe' });
}
