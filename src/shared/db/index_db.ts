import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const globalPool = globalThis as unknown as { pool: Pool };

if (!globalPool.pool) {
  globalPool.pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
  });
}

const pool = globalPool.pool;

export const db = drizzle(pool, { schema });
