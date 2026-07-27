/**
 * Local development server entrypoint.
 *
 * Imports the fully-configured Fastify app from app.js and starts
 * listening on a TCP port. This file is NOT used in Vercel production —
 * Vercel uses api/index.js instead.
 */
import { app } from './app.js';
import prisma from './db/prisma.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`🏥  NM Practical Portal API  →  http://localhost:${PORT}`);
} catch (err) {
  app.log.error(err);
  await prisma.$disconnect();
  process.exit(1);
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
// Ensures in-flight requests complete and DB pool drains cleanly
const SIGNALS = ['SIGTERM', 'SIGINT'];
SIGNALS.forEach((signal) => {
  process.on(signal, async () => {
    app.log.info(`Received ${signal} — shutting down gracefully`);
    await app.close();         // stops accepting new connections
    await prisma.$disconnect(); // drains pg pool
    process.exit(0);
  });
});
