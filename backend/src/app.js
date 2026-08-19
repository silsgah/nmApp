import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import 'dotenv/config';

// ── Production-grade DB singleton (no multiple pool spawning) ──────────────
import prisma from './db/prisma.js';

// ── Route plugins ───────────────────────────────────────────────────────────
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import programmeRoutes from './routes/programmes.js';
import categoryRoutes from './routes/categories.js';
import taskRoutes from './routes/tasks.js';
import sessionRoutes from './routes/sessions.js';
import stationRoutes from './routes/stations.js';
import assignmentRoutes from './routes/assignments.js';
import scorecardRoutes from './routes/scorecards.js';
import resultRoutes from './routes/results.js';
import carePlanRoutes from './routes/careplans.js';
import caseStudyRoutes from './routes/case-studies.js';
import obstetricRoutes from './routes/obstetric.js';

// ── Build Fastify app ────────────────────────────────────────────────────────
const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'development' ? 'info' : 'warn',
    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
  // Return validation errors as proper JSON
  ajv: {
    customOptions: {
      removeAdditional: 'all',
      coerceTypes: true,
      allErrors: false,
    },
  },
});

// ── Plugins ──────────────────────────────────────────────────────────────────
await app.register(cors, {
  origin: (process.env.FRONTEND_URL || 'http://localhost:3000').split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET,
  cookie: { cookieName: 'nm_token', signed: false },
});

await app.register(cookie);

// ── Decorators ───────────────────────────────────────────────────────────────
// Attach the singleton prisma instance — shared across all requests
app.decorate('prisma', prisma);

// Authentication guard — throws 401 if token missing/invalid
app.decorate('authenticate', async function (request, reply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'Valid authentication is required',
    });
  }
});

// Role guard factory — returns a preHandler that enforces role membership
app.decorate('requireRole', function (...roles) {
  return async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    if (!roles.includes(request.user.role)) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: `This action requires one of: ${roles.join(', ')}`,
      });
    }
  };
});

// ── Global error handler ─────────────────────────────────────────────────────
app.setErrorHandler((error, request, reply) => {
  const statusCode = error.statusCode ?? 500;

  // Don't expose internal details in production
  if (statusCode >= 500 && process.env.NODE_ENV === 'production') {
    app.log.error({ err: error, url: request.url }, 'Internal server error');
    return reply.code(500).send({ error: 'Internal Server Error' });
  }

  return reply.code(statusCode).send({
    error: error.name ?? 'Error',
    message: error.message,
    ...(error.validation && { details: error.validation }),
  });
});

// ── Routes ───────────────────────────────────────────────────────────────────
const PREFIX = '/api/v1';

await app.register(authRoutes,       { prefix: `${PREFIX}/auth` });
await app.register(userRoutes,       { prefix: `${PREFIX}/users` });
await app.register(programmeRoutes,  { prefix: `${PREFIX}/programmes` });
await app.register(categoryRoutes,   { prefix: `${PREFIX}/categories` });
await app.register(taskRoutes,       { prefix: `${PREFIX}/tasks` });
await app.register(sessionRoutes,    { prefix: `${PREFIX}/sessions` });
await app.register(stationRoutes,    { prefix: `${PREFIX}/stations` });
await app.register(assignmentRoutes, { prefix: `${PREFIX}/assignments` });
await app.register(scorecardRoutes,  { prefix: `${PREFIX}/scorecards` });
await app.register(resultRoutes,     { prefix: `${PREFIX}/results` });
await app.register(carePlanRoutes,   { prefix: `${PREFIX}/care-plans` });
await app.register(caseStudyRoutes,  { prefix: `${PREFIX}/case-studies` });
await app.register(obstetricRoutes,  { prefix: `${PREFIX}/obstetric` });

// Health / readiness probe (for load balancers / uptime monitors)
app.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  env: process.env.NODE_ENV,
}));

// 404 handler
app.setNotFoundHandler((request, reply) => {
  reply.code(404).send({
    error: 'Not Found',
    message: `Route ${request.method} ${request.url} not found`,
  });
});

export { app };
export default app;
