/**
 * Vercel Serverless Function entrypoint.
 *
 * Imports the fully-configured Fastify app and hands each incoming
 * HTTP request to it. Vercel routes all traffic here via vercel.json.
 */
import { app } from '../src/app.js';

export default async function handler(req, res) {
  await app.ready();
  app.server.emit('request', req, res);
}
