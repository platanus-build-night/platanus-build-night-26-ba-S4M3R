import http from 'node:http';
import { handleRequest, setServerStartTime } from './routes.js';
import { initStores } from '../store/index.js';
import logger from '../utils/logger.js';

const HOST = '127.0.0.1';
const PORT = 3214;

// ============================================
// JSON Body Parser
// ============================================

/**
 * Reads the request body and parses it as JSON.
 * Returns an empty object for GET/DELETE requests or if body is empty.
 */
function parseJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    // Skip body parsing for non-body methods
    if (req.method === 'GET' || req.method === 'DELETE' || req.method === 'HEAD') {
      resolve({});
      return;
    }

    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        resolve(parsed);
      } catch {
        reject(new Error('Invalid JSON in request body'));
      }
    });
    req.on('error', (err) => {
      reject(err);
    });
  });
}

// ============================================
// Server Lifecycle
// ============================================

let serverInstance: http.Server | null = null;

/**
 * Starts the HTTP daemon server on 127.0.0.1:3214.
 * Initializes storage before binding.
 * Returns the http.Server instance.
 */
export async function startServer(): Promise<http.Server> {
  // Initialize storage layer
  await initStores();

  // Record start time for uptime calculation
  const startTime = Date.now();
  setServerStartTime(startTime);

  const server = http.createServer(async (req, res) => {
    // Set JSON content type for all responses
    res.setHeader('Content-Type', 'application/json');

    try {
      const body = await parseJsonBody(req);
      await handleRequest(req, res, body);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';

      // Handle JSON parse errors specifically
      if (message === 'Invalid JSON in request body') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON in request body' }));
        return;
      }

      logger.error({ error: message, url: req.url, method: req.method }, 'Unhandled server error');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error', details: message }));
    }
  });

  return new Promise((resolve, reject) => {
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(
          { port: PORT, host: HOST },
          `Port ${PORT} is already in use. Stop the conflicting process or configure a different port.`,
        );
      } else {
        logger.error({ error: err.message }, 'Server failed to start');
      }
      reject(err);
    });

    server.listen(PORT, HOST, () => {
      serverInstance = server;
      logger.info({ host: HOST, port: PORT, pid: process.pid }, `Daemon server listening on ${HOST}:${PORT}`);
      resolve(server);
    });
  });
}

/**
 * Gracefully stops the HTTP daemon server.
 */
export async function stopServer(): Promise<void> {
  if (!serverInstance) {
    return;
  }

  return new Promise((resolve, reject) => {
    serverInstance!.close((err) => {
      if (err) {
        logger.error({ error: err.message }, 'Error stopping server');
        reject(err);
        return;
      }
      logger.info('Daemon server stopped');
      serverInstance = null;
      resolve();
    });
  });
}
