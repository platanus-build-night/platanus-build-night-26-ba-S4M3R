import { startServer, stopServer } from './server.js';
import { removePid, writePid } from './lifecycle.js';
import logger from '../utils/logger.js';

/**
 * Daemon entry point.
 *
 * This file is the target for child_process.spawn() when starting the daemon
 * as a detached background process. It:
 * 1. Starts the HTTP server (which initializes stores internally)
 * 2. Writes the PID file for lifecycle management
 * 3. Handles graceful shutdown on SIGTERM/SIGINT
 */

async function main(): Promise<void> {
  try {
    await startServer();
    writePid(process.pid);
    logger.info({ pid: process.pid }, 'Daemon process started');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ error: message }, 'Failed to start daemon');
    process.exit(1);
  }

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Received shutdown signal, stopping daemon');
    try {
      await stopServer();
      removePid();
      logger.info('Daemon stopped gracefully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ error: message }, 'Error during daemon shutdown');
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.on('SIGINT', () => { void shutdown('SIGINT'); });
}

void main();
