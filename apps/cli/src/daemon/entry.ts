import fs from 'node:fs';
import path from 'node:path';
import { startServer, stopServer } from './server.js';
import { removePid, writePid } from './lifecycle.js';
import { connectWhatsApp, disconnectWhatsApp, onMessage } from '../whatsapp/connection.js';
import { createMessageHandler } from '../whatsapp/handler.js';
import logger from '../utils/logger.js';

const AUTH_DIR = path.resolve('.relay-agent', 'whatsapp-auth');

/**
 * Daemon entry point.
 *
 * This file is the target for child_process.spawn() when starting the daemon
 * as a detached background process. It:
 * 1. Starts the HTTP server (which initializes stores internally)
 * 2. Writes the PID file for lifecycle management
 * 3. Auto-connects WhatsApp if auth state exists
 * 4. Registers the incoming message handler
 * 5. Handles graceful shutdown on SIGTERM/SIGINT
 */

async function main(): Promise<void> {
  try {
    await startServer();
    writePid(process.pid);
    logger.info({ pid: process.pid }, 'Daemon process started');

    // Register the message handler for incoming WhatsApp messages
    const messageHandler = createMessageHandler();
    onMessage(messageHandler);

    // Auto-connect WhatsApp if auth state exists from a previous session
    if (fs.existsSync(AUTH_DIR)) {
      logger.info('WhatsApp auth state found, auto-connecting');
      try {
        await connectWhatsApp();
      } catch (err) {
        const waError = err instanceof Error ? err.message : 'Unknown error';
        logger.warn({ error: waError }, 'WhatsApp auto-connect failed on startup (will retry on relay init)');
      }
    } else {
      logger.info('No WhatsApp auth state found. Run `relay init` to connect.');
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ error: message }, 'Failed to start daemon');
    process.exit(1);
  }

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Received shutdown signal, stopping daemon');
    try {
      await disconnectWhatsApp();
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
