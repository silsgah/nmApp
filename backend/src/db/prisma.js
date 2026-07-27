/**
 * Production-grade Prisma singleton with pg driver adapter.
 *
 * Why a singleton?
 * ─────────────────
 * Node.js hot-reloading reinstantiates modules on every file change, which
 * would open a new connection pool each time. We prevent this by caching the
 * instance on globalThis (which survives hot reloads in dev) while using a
 * simple module-scoped singleton in production.
 *
 * Why pg driver adapter (Prisma 7)?
 * ───────────────────────────────────
 * Prisma 7 decoupled its query engine from transport. The pg adapter gives:
 *  • A bounded pg.Pool shared across all requests
 *  • Proper SSL + pooler support for Supabase Transaction pooler
 *  • Zero zombie connections on hot reload
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('[DB] Environment variable keys present in system:', Object.keys(process.env));
    throw new Error('[DB] DATABASE_URL environment variable is not set');
  }

  /**
   * Supabase Transaction Pooler (port 6543) notes:
   *  - Uses pgBouncer in transaction mode → no prepared statements
   *  - SSL is terminated at the pooler → no rejectUnauthorized needed
   *  - max pool size: Supabase free = 60 total; keep headroom for other clients
   */
  const pool = new Pool({
    connectionString,
    max: 10,                    // max concurrent connections from this process
    idleTimeoutMillis: 30_000,  // release idle connections after 30 s
    connectionTimeoutMillis: 8_000, // fail fast if pooler unreachable
  });

  pool.on('error', (err) => {
    // Surface pool-level errors immediately — they're usually config issues
    console.error('[DB] Unexpected idle client error:', err.message);
  });

  const adapter = new PrismaPg(pool);

  const client = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? [{ emit: 'event', level: 'query' }, 'warn', 'error']
        : ['warn', 'error'],
  });

  if (process.env.NODE_ENV === 'development') {
    // @ts-ignore — event only available when log includes query event
    client.$on('query', (e) => {
      if (e.duration > 200) {
        console.warn(`[DB] Slow query (${e.duration}ms): ${e.query}`);
      }
    });
  }

  return client;
}

// ── Singleton guard ───────────────────────────────────────────────────────────
const GLOBAL_KEY = Symbol.for('nm_portal_prisma');

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = createPrismaClient();
} else {
  if (!globalThis[GLOBAL_KEY]) {
    globalThis[GLOBAL_KEY] = createPrismaClient();
  }
  prisma = globalThis[GLOBAL_KEY];
}

export { prisma };
export default prisma;
